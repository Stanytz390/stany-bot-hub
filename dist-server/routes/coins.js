import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { CoinLink } from "../models/CoinLink.js";
import { CoinClaim } from "../models/CoinClaim.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { getClientIP } from "../utils/fingerprint.js";
import { notifyOwner } from "../services/notify.js";
const router = Router();
// ============================================================
// SECURITY LIMITS
// ============================================================
const MIN_TRANSFER = 1;
const MAX_TRANSFER_PER_TX = 500;
const MAX_DAILY_SENT = 1000;
const MIN_ACCOUNT_AGE_MS = 30 * 60 * 1000; // 30 minutes old account before sending
const MAX_LINKS_PER_DAY = 5;
const MAX_PEOPLE_PER_LINK = 100;
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
async function sentToday(userId) {
    const rows = await Transaction.aggregate([
        { $match: { userId, type: "transfer_out", createdAt: { $gte: startOfToday() } } },
        { $group: { _id: null, total: { $sum: "$txAmount" } } },
    ]);
    return rows[0]?.total || 0;
}
// ============================================================
// 1. DIRECT TRANSFER TO A USERNAME
// ============================================================
router.post("/transfer", authGuard, banCheck, async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const schema = z.object({
            username: z.string().min(3).max(20),
            amount: z.number().int().min(MIN_TRANSFER).max(MAX_TRANSFER_PER_TX),
            note: z.string().max(120).optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: `Enter a valid username and an amount between ${MIN_TRANSFER} and ${MAX_TRANSFER_PER_TX} SQ` });
            return;
        }
        const { username, amount } = parsed.data;
        const sender = await User.findById(req.user._id);
        if (!sender) {
            res.status(404).json({ error: "Account not found" });
            return;
        }
        if (Date.now() - new Date(sender.createdAt).getTime() < MIN_ACCOUNT_AGE_MS) {
            res.status(403).json({ error: "New accounts can send coins after 30 minutes" });
            return;
        }
        const target = await User.findOne({ username: username.toLowerCase().replace("@", "") });
        if (!target) {
            res.status(404).json({ error: `User @${username} was not found` });
            return;
        }
        if (target._id.equals(sender._id)) {
            res.status(400).json({ error: "You cannot send coins to yourself" });
            return;
        }
        if (target.isBanned) {
            res.status(400).json({ error: "This account is suspended" });
            return;
        }
        if (sender.txCoins < amount) {
            res.status(400).json({ error: "You do not have enough SQ coins" });
            return;
        }
        const already = await sentToday(sender._id);
        if (already + amount > MAX_DAILY_SENT) {
            res.status(429).json({ error: `Daily transfer limit is ${MAX_DAILY_SENT} SQ. You already sent ${already} SQ today.` });
            return;
        }
        // Standalone MongoDB deployments do not support multi-document transactions,
        // so fall back to a conditional (atomic) debit + credit when they are unavailable.
        const runTransfer = async (s) => {
            const opts = s ? { session: s } : {};
            const debit = await User.updateOne({ _id: sender._id, txCoins: { $gte: amount } }, { $inc: { txCoins: -amount } }, opts);
            if (debit.modifiedCount !== 1)
                throw new Error("You do not have enough SQ coins");
            await User.updateOne({ _id: target._id }, { $inc: { txCoins: amount } }, opts);
            await Transaction.create([
                { userId: sender._id, type: "transfer_out", txAmount: amount, tzsAmount: 0, status: "success" },
                { userId: target._id, type: "transfer_in", txAmount: amount, tzsAmount: 0, status: "success" },
            ], s ? { session: s } : {});
        };
        try {
            await session.withTransaction(() => runTransfer(session));
        }
        catch (txErr) {
            const msg = txErr instanceof Error ? txErr.message : "";
            if (msg.includes("enough SQ"))
                throw txErr;
            // Replica-set / transaction unsupported → retry without a session.
            await runTransfer();
        }
        const senderName = sender.username || sender.email;
        notifyOwner(`🔁 *Coin Transfer*\n\n👤 From: @${senderName}\n👥 To: @${target.username}\n💰 Amount: ${amount} SQ`).catch(() => { });
        res.json({
            ok: true,
            amount,
            to: target.username,
            newBalance: sender.txCoins - amount,
            message: `🎉 Success! You sent ${amount} SQ to @${target.username}`,
            recipientMessage: `Congratulations to you 🎉 you get ${amount} SQ from ${senderName}`,
        });
    }
    catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Transfer failed" });
    }
    finally {
        session.endSession();
    }
});
// ============================================================
// 2. CREATE A SHAREABLE GIFT LINK (escrowed coins)
// ============================================================
router.post("/links", authGuard, banCheck, async (req, res) => {
    try {
        const schema = z.object({
            amountPerUser: z.number().int().min(MIN_TRANSFER).max(MAX_TRANSFER_PER_TX),
            people: z.number().int().min(1).max(MAX_PEOPLE_PER_LINK),
            message: z.string().max(120).optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: `Amount 1-${MAX_TRANSFER_PER_TX} SQ and 1-${MAX_PEOPLE_PER_LINK} people` });
            return;
        }
        const { amountPerUser, people, message } = parsed.data;
        const total = amountPerUser * people;
        const sender = await User.findById(req.user._id);
        if (!sender) {
            res.status(404).json({ error: "Account not found" });
            return;
        }
        if (Date.now() - new Date(sender.createdAt).getTime() < MIN_ACCOUNT_AGE_MS) {
            res.status(403).json({ error: "New accounts can create gift links after 30 minutes" });
            return;
        }
        if (sender.txCoins < total) {
            res.status(400).json({ error: `You need ${total} SQ for this link (you have ${sender.txCoins} SQ)` });
            return;
        }
        const already = await sentToday(sender._id);
        if (already + total > MAX_DAILY_SENT) {
            res.status(429).json({ error: `Daily limit is ${MAX_DAILY_SENT} SQ. You already sent ${already} SQ today.` });
            return;
        }
        const linksToday = await CoinLink.countDocuments({ creatorId: sender._id, createdAt: { $gte: startOfToday() } });
        if (linksToday >= MAX_LINKS_PER_DAY) {
            res.status(429).json({ error: `You can create only ${MAX_LINKS_PER_DAY} gift links per day` });
            return;
        }
        // Escrow: deduct upfront so the link is always funded.
        const updated = await User.findOneAndUpdate({ _id: sender._id, txCoins: { $gte: total } }, { $inc: { txCoins: -total } }, { new: true });
        if (!updated) {
            res.status(400).json({ error: "Not enough SQ coins" });
            return;
        }
        const username = sender.username || "user";
        const code = `${username}-${crypto.randomBytes(4).toString("hex")}`.toLowerCase();
        const link = await CoinLink.create({
            code,
            creatorId: sender._id,
            creatorUsername: username,
            amountPerUser,
            maxClaims: people,
            message: message || "",
            expiresAt: new Date(Date.now() + LINK_TTL_MS),
        });
        await Transaction.create({
            userId: sender._id,
            type: "transfer_out",
            txAmount: total,
            tzsAmount: 0,
            status: "success",
        });
        res.json({
            ok: true,
            code: link.code,
            url: `/claim/${link.code}`,
            amountPerUser,
            people,
            total,
            expiresAt: link.expiresAt,
            newBalance: updated.txCoins,
        });
    }
    catch {
        res.status(500).json({ error: "Could not create gift link" });
    }
});
// My gift links
router.get("/links", authGuard, async (req, res) => {
    const links = await CoinLink.find({ creatorId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(links.map((l) => ({
        _id: l._id,
        code: l.code,
        amountPerUser: l.amountPerUser,
        maxClaims: l.maxClaims,
        claimed: l.claims?.length || 0,
        message: l.message,
        active: l.active,
        expiresAt: l.expiresAt,
        createdAt: l.createdAt,
    })));
});
// Cancel a link and refund the unclaimed remainder
router.post("/links/:code/cancel", authGuard, async (req, res) => {
    try {
        const link = await CoinLink.findOne({ code: req.params.code, creatorId: req.user._id });
        if (!link) {
            res.status(404).json({ error: "Link not found" });
            return;
        }
        if (!link.active) {
            res.status(400).json({ error: "Link already closed" });
            return;
        }
        const remaining = (link.maxClaims - (link.claims?.length || 0)) * link.amountPerUser;
        link.active = false;
        await link.save();
        if (remaining > 0) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { txCoins: remaining } });
            await Transaction.create({ userId: req.user._id, type: "refund", txAmount: remaining, tzsAmount: 0, status: "success" });
        }
        res.json({ ok: true, refunded: remaining });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
// Public preview of a link
router.get("/links/:code/preview", async (req, res) => {
    const link = await CoinLink.findOne({ code: req.params.code }).lean();
    if (!link) {
        res.status(404).json({ error: "This gift link does not exist" });
        return;
    }
    const claimed = link.claims?.length || 0;
    res.json({
        code: link.code,
        from: link.creatorUsername,
        amountPerUser: link.amountPerUser,
        maxClaims: link.maxClaims,
        claimed,
        remaining: Math.max(0, link.maxClaims - claimed),
        message: link.message,
        active: link.active && new Date(link.expiresAt).getTime() > Date.now(),
        expiresAt: link.expiresAt,
    });
});
// ============================================================
// 3. CLAIM A GIFT LINK
// ============================================================
router.post("/links/:code/claim", authGuard, banCheck, async (req, res) => {
    try {
        const link = await CoinLink.findOne({ code: req.params.code });
        if (!link) {
            res.status(404).json({ error: "This gift link does not exist" });
            return;
        }
        if (!link.active) {
            res.status(400).json({ error: "This gift link is closed" });
            return;
        }
        if (new Date(link.expiresAt).getTime() < Date.now()) {
            res.status(400).json({ error: "This gift link has expired" });
            return;
        }
        if (link.creatorId.equals(req.user._id)) {
            res.status(400).json({ error: "You cannot claim your own gift link" });
            return;
        }
        const claimed = link.claims?.length || 0;
        if (claimed >= link.maxClaims) {
            res.status(400).json({ error: "All coins from this link have been claimed" });
            return;
        }
        if (link.claims?.some((c) => c.userId?.toString() === req.user._id.toString())) {
            res.status(400).json({ error: "You already claimed this gift" });
            return;
        }
        const ip = getClientIP(req);
        // One claim per IP per link (anti multi-account abuse).
        if (ip && link.claims?.some((c) => c.ip === ip)) {
            res.status(429).json({ error: "This device already claimed this gift" });
            return;
        }
        const me = await User.findById(req.user._id);
        if (!me) {
            res.status(404).json({ error: "Account not found" });
            return;
        }
        if (Date.now() - new Date(me.createdAt).getTime() < 5 * 60 * 1000) {
            res.status(403).json({ error: "Your account is too new to claim gifts. Try again in a few minutes." });
            return;
        }
        // Hard, race-proof reservation: the unique (linkId,userId) and (linkId,ip)
        // indexes on CoinClaim make it impossible to claim the same gift twice,
        // even with concurrent requests from the same account or device.
        let reservation;
        try {
            reservation = await CoinClaim.create({
                linkId: link._id,
                code: link.code,
                userId: me._id,
                username: me.username || "",
                ip: ip || `no-ip:${me._id.toString()}`,
                amount: link.amountPerUser,
            });
        }
        catch {
            res.status(400).json({ error: "You already claimed this gift" });
            return;
        }
        const updated = await CoinLink.findOneAndUpdate({
            _id: link._id,
            active: true,
            [`claims.${link.maxClaims - 1}`]: { $exists: false },
            "claims.userId": { $ne: me._id },
        }, {
            $push: {
                claims: { userId: me._id, username: me.username || "", ip, at: new Date() },
            },
        }, { new: true });
        if (!updated) {
            // Nothing left to hand out — release the reservation so the ledger stays clean.
            await CoinClaim.findByIdAndDelete(reservation._id).catch(() => { });
            res.status(400).json({ error: "This gift is no longer available" });
            return;
        }
        await User.findByIdAndUpdate(me._id, { $inc: { txCoins: link.amountPerUser } });
        await Transaction.create({
            userId: me._id,
            type: "transfer_in",
            txAmount: link.amountPerUser,
            tzsAmount: 0,
            status: "success",
        });
        if ((updated.claims?.length || 0) >= updated.maxClaims) {
            updated.active = false;
            await updated.save();
        }
        res.json({
            ok: true,
            amount: link.amountPerUser,
            from: link.creatorUsername,
            message: `Congratulations to you 🎉 you get ${link.amountPerUser} SQ from ${link.creatorUsername}`,
            newBalance: me.txCoins + link.amountPerUser,
        });
    }
    catch {
        res.status(500).json({ error: "Could not claim this gift" });
    }
});
// Limits for the UI
router.get("/limits", authGuard, async (_req, res) => {
    res.json({
        minTransfer: MIN_TRANSFER,
        maxTransferPerTx: MAX_TRANSFER_PER_TX,
        maxDailySent: MAX_DAILY_SENT,
        maxPeoplePerLink: MAX_PEOPLE_PER_LINK,
        maxLinksPerDay: MAX_LINKS_PER_DAY,
    });
});
export default router;
