import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { ApiKey, ApiUsage } from "../models/ApiKey.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
const router = Router();
const MAX_KEYS_PER_USER = 5;
export function generateApiKey() {
    return `STANY-${crypto.randomBytes(16).toString("hex")}`;
}
function mask(key) {
    return `${key.slice(0, 12)}${"•".repeat(10)}${key.slice(-4)}`;
}
router.use(authGuard);
router.use(banCheck);
/** List my keys (masked). */
router.get("/", async (req, res) => {
    const keys = await ApiKey.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({
        keys: keys.map((k) => ({
            _id: String(k._id),
            name: k.name,
            masked: mask(k.key),
            active: k.active,
            callCount: k.callCount,
            sqSpent: k.sqSpent,
            lastUsedAt: k.lastUsedAt,
            createdAt: k.createdAt,
        })),
    });
});
/** Create a key. */
router.post("/", async (req, res) => {
    const parsed = z.object({ name: z.string().trim().min(1).max(40).optional() }).safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid key name" });
        return;
    }
    const count = await ApiKey.countDocuments({ userId: req.user._id });
    if (count >= MAX_KEYS_PER_USER) {
        res.status(429).json({ error: `You can hold up to ${MAX_KEYS_PER_USER} API keys` });
        return;
    }
    const key = await ApiKey.create({
        userId: req.user._id,
        name: parsed.data.name || `Key ${count + 1}`,
        key: generateApiKey(),
    });
    res.json({ ok: true, _id: String(key._id), name: key.name, key: key.key });
});
/** Reveal the full key value. */
router.get("/:id/reveal", async (req, res) => {
    const key = await ApiKey.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!key) {
        res.status(404).json({ error: "Key not found" });
        return;
    }
    res.json({ key: key.key });
});
/** Regenerate — the old value stops working immediately. */
router.post("/:id/regenerate", async (req, res) => {
    const key = await ApiKey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!key) {
        res.status(404).json({ error: "Key not found" });
        return;
    }
    key.key = generateApiKey();
    await key.save();
    res.json({ ok: true, key: key.key });
});
/** Enable / disable without deleting. */
router.patch("/:id", async (req, res) => {
    const parsed = z.object({ active: z.boolean().optional(), name: z.string().trim().min(1).max(40).optional() }).safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    const key = await ApiKey.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, parsed.data, { new: true });
    if (!key) {
        res.status(404).json({ error: "Key not found" });
        return;
    }
    res.json({ ok: true, active: key.active, name: key.name });
});
router.delete("/:id", async (req, res) => {
    await ApiKey.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ ok: true });
});
/** Recent metered calls for my keys. */
router.get("/usage/recent", async (req, res) => {
    const rows = await ApiUsage.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ usage: rows.map((r) => ({ endpoint: r.endpoint, method: r.method, cost: r.cost, status: r.status, createdAt: r.createdAt })) });
});
export default router;
