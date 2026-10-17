import { Router } from "express";
import { Notification } from "../models/Notification.js";
import { authGuard } from "../middleware/auth.js";
import { superAdminGuard } from "../middleware/roleGuard.js";
import { writeAudit } from "../models/AuditLog.js";
const router = Router();
/** Active broadcasts for any signed-in user. */
router.get("/", authGuard, async (_req, res) => {
    try {
        const items = await Notification.find({ active: true }).sort({ createdAt: -1 }).limit(30).lean();
        res.json({ items });
    }
    catch {
        res.json({ items: [] });
    }
});
/** Admin: every broadcast (including hidden ones). */
router.get("/all", authGuard, superAdminGuard, async (_req, res) => {
    const items = await Notification.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ items });
});
router.post("/", authGuard, superAdminGuard, async (req, res) => {
    try {
        const { title, body = "", url = "", level = "info" } = req.body;
        if (!title || !title.trim()) {
            res.status(400).json({ error: "Title is required" });
            return;
        }
        const item = await Notification.create({
            title: title.trim(), body, url, level, createdBy: req.user.email,
        });
        writeAudit({
            action: "notification.send",
            actorId: req.user._id,
            actorEmail: req.user.email,
            actorRole: "admin",
            targetId: item._id,
            targetLabel: item.title,
            after: `${level}: ${body || ""}`.slice(0, 300),
            ip: req.headers["x-forwarded-for"] || req.ip || "",
        }).catch(() => { });
        res.json({ ok: true, item });
    }
    catch {
        res.status(500).json({ error: "Could not send notification" });
    }
});
router.put("/:id", authGuard, superAdminGuard, async (req, res) => {
    try {
        const { title, body, url, level, active } = req.body;
        const item = await Notification.findByIdAndUpdate(req.params.id, { ...(title !== undefined && { title }), ...(body !== undefined && { body }), ...(url !== undefined && { url }), ...(level !== undefined && { level }), ...(active !== undefined && { active }) }, { new: true });
        if (!item) {
            res.status(404).json({ error: "Notification not found" });
            return;
        }
        writeAudit({
            action: "notification.update",
            actorId: req.user._id,
            actorEmail: req.user.email,
            actorRole: "admin",
            targetId: item._id,
            targetLabel: item.title,
            after: JSON.stringify(req.body).slice(0, 300),
            ip: req.headers["x-forwarded-for"] || req.ip || "",
        }).catch(() => { });
        res.json({ ok: true, item });
    }
    catch {
        res.status(500).json({ error: "Could not update notification" });
    }
});
router.delete("/:id", authGuard, superAdminGuard, async (req, res) => {
    const removed = await Notification.findByIdAndDelete(req.params.id);
    writeAudit({
        action: "notification.delete",
        actorId: req.user._id,
        actorEmail: req.user.email,
        actorRole: "admin",
        targetLabel: removed?.title || String(req.params.id),
        ip: req.headers["x-forwarded-for"] || req.ip || "",
    }).catch(() => { });
    res.json({ ok: true });
});
export default router;
