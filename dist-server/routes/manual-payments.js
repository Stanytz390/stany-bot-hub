import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ManualPayment } from "../models/ManualPayment.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { notifyOwner } from "../services/notify.js";
const router = Router();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "stanytzhosting@gmail.com";
export const PAYPAL_EMAIL = process.env.PAYPAL_EMAIL || "masanyiwastanley378@gmail.com";
const MAX_PROOF_CHARS = 2_800_000; // ~2MB base64 image
async function adminAuth(req, res, next) {
    const token = req.cookies?.token ||
        req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "");
        const user = await User.findById(decoded.userId).lean();
        if (!user || user.email !== ADMIN_EMAIL) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
// Public config for the TopUp page
router.get("/config", (_req, res) => {
    res.json({ paypalEmail: PAYPAL_EMAIL });
});
// USER: submit a manual payment for approval
router.post("/", authGuard, banCheck, async (req, res) => {
    try {
        const schema = z.object({
            method: z.enum(["paypal", "minipay", "btc", "bnb", "bank", "other"]),
            sqAmount: z.number().int().min(1).max(100000),
            amount: z.number().min(0).optional(),
            currency: z.string().max(6).optional(),
            payerEmail: z.string().email().optional(),
            reference: z.string().max(120).optional(),
            note: z.string().max(300).optional(),
            proofUrl: z.string().max(MAX_PROOF_CHARS).optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Please fill all payment details correctly" });
            return;
        }
        const user = await User.findById(req.user._id).lean();
        const pending = await ManualPayment.countDocuments({ userId: req.user._id, status: "pending" });
        if (pending >= 3) {
            res.status(429).json({ error: "You already have 3 pending requests. Please wait for approval." });
            return;
        }
        const doc = await ManualPayment.create({
            ...parsed.data,
            userId: req.user._id,
            username: user?.username || "",
            email: user?.email || "",
        });
        notifyOwner(`🧾 *Manual Payment Request*\n\n👤 @${doc.username || doc.email}\n💳 Method: ${doc.method.toUpperCase()}\n💰 ${doc.sqAmount} SQ (${doc.amount} ${doc.currency})\n🔖 Ref: ${doc.reference || "-"}\n⏳ Waiting for approval`).catch(() => { });
        res.json({ ok: true, id: doc._id, message: "Request sent. Admin will approve shortly." });
    }
    catch {
        res.status(500).json({ error: "Could not submit your payment" });
    }
});
// USER: my requests
router.get("/mine", authGuard, async (req, res) => {
    const rows = await ManualPayment.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    res.json(rows.map((r) => ({ ...r, proofUrl: r.proofUrl ? "uploaded" : "" })));
});
// ADMIN: list
router.get("/admin/all", adminAuth, async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const filter = status && status !== "all" ? { status } : {};
    const rows = await ManualPayment.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    res.json(rows);
});
// ADMIN: approve / reject (single or bulk = mark all)
router.post("/admin/review", adminAuth, async (req, res) => {
    try {
        const schema = z.object({
            ids: z.array(z.string()).min(1),
            action: z.enum(["approve", "reject", "delete"]),
            adminNote: z.string().max(200).optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid request" });
            return;
        }
        const { ids, action, adminNote } = parsed.data;
        if (action === "delete") {
            const r = await ManualPayment.deleteMany({ _id: { $in: ids } });
            res.json({ ok: true, affected: r.deletedCount });
            return;
        }
        let affected = 0;
        for (const id of ids) {
            // Atomic transition: only a still-pending request can be reviewed,
            // so an approval can never credit the same payment twice.
            const doc = await ManualPayment.findOneAndUpdate({ _id: id, status: "pending" }, {
                $set: {
                    status: action === "approve" ? "approved" : "rejected",
                    adminNote: adminNote || "",
                    reviewedAt: new Date(),
                },
            }, { new: true });
            if (!doc)
                continue;
            affected++;
            if (action === "approve") {
                await User.findByIdAndUpdate(doc.userId, { $inc: { txCoins: doc.sqAmount } });
                await Transaction.create({
                    userId: doc.userId,
                    type: "topup",
                    txAmount: doc.sqAmount,
                    tzsAmount: doc.amount || 0,
                    status: "success",
                    method: doc.method,
                    itemName: "SQ Top-up",
                    reference: `MP_${String(doc._id)}`,
                    channelProvider: doc.method.toUpperCase(),
                });
            }
        }
        res.json({ ok: true, affected });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
// ADMIN: full proof image
router.get("/admin/:id/proof", adminAuth, async (req, res) => {
    const doc = await ManualPayment.findById(req.params.id).lean();
    if (!doc) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json({ proofUrl: doc.proofUrl });
});
export default router;
