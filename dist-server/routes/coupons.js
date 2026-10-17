import { Router } from "express";
import { z } from "zod";
import { Coupon } from "../models/Coupon.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
const router = Router();
router.use(authGuard);
router.use(banCheck);
/** One place decides whether a coupon can be redeemed, and why not. */
async function inspect(code, userId) {
    const upper = code.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: upper });
    if (!coupon) {
        return { code: upper, ok: false, status: 404, reason: "not_found", error: `Coupon ${upper} does not exist. Check the code and try again.` };
    }
    if (coupon.active === false) {
        return { code: upper, ok: false, status: 403, reason: "disabled", error: `Coupon ${upper} has been disabled by an admin.` };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        return {
            code: upper, ok: false, status: 410, reason: "expired",
            error: `Coupon ${upper} expired on ${new Date(coupon.expiresAt).toLocaleDateString()}.`,
        };
    }
    if (coupon.claimedBy) {
        const mine = String(coupon.claimedBy) === String(userId);
        return {
            code: upper, ok: false, status: 409, reason: "used",
            error: mine ? `You already redeemed ${upper}.` : `Coupon ${upper} has already been redeemed by another user.`,
        };
    }
    return { code: upper, ok: true, txAmount: coupon.txAmount };
}
/** Pre-check used by the redeem page so the user sees the reason before submitting. */
router.get("/validate/:code", async (req, res) => {
    try {
        const verdict = await inspect(String(req.params.code || ""), String(req.user._id));
        if (!verdict.ok) {
            res.status(200).json({ valid: false, code: verdict.code, reason: verdict.reason, message: verdict.error });
            return;
        }
        res.json({ valid: true, code: verdict.code, txAmount: verdict.txAmount, message: `${verdict.code} is valid for ${verdict.txAmount} SQ.` });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
router.post("/claim", async (req, res) => {
    try {
        const schema = z.object({ code: z.string().min(1) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Enter a coupon code first", reason: "invalid" });
            return;
        }
        const verdict = await inspect(parsed.data.code, String(req.user._id));
        if (!verdict.ok) {
            res.status(verdict.status).json({ error: verdict.error, reason: verdict.reason });
            return;
        }
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Atomic claim — first request wins, everyone else gets "already redeemed".
        const claimed = await Coupon.findOneAndUpdate({ code: verdict.code, claimedBy: null }, { claimedBy: user._id, claimedAt: new Date() }, { new: true });
        if (!claimed) {
            res.status(409).json({ error: `Coupon ${verdict.code} has already been redeemed.`, reason: "used" });
            return;
        }
        user.txCoins += claimed.txAmount;
        await user.save();
        await Transaction.create({
            userId: user._id,
            type: "admin_grant",
            txAmount: claimed.txAmount,
            tzsAmount: 0,
            status: "success",
            itemName: `Coupon ${claimed.code}`,
            reference: claimed.code,
        });
        res.json({
            success: true,
            message: `You've redeemed ${claimed.code} and received ${claimed.txAmount} SQ!`,
            txAmount: claimed.txAmount,
            newBalance: user.txCoins,
        });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
export default router;
