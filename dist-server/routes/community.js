import { Router } from "express";
import { z } from "zod";
import { Message } from "../models/Message.js";
import { MessageReport } from "../models/MessageReport.js";
import { User } from "../models/User.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { roleOf, staffGuard } from "../middleware/roleGuard.js";
import { writeAudit } from "../models/AuditLog.js";
const router = Router();
router.use(authGuard);
router.use(banCheck);
const clients = new Set();
let clientSeq = 0;
function broadcast(event, payload, staffOnly = false) {
    const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const c of clients) {
        if (staffOnly && !c.staff)
            continue;
        try {
            c.res.write(data);
        }
        catch { /* client gone */ }
    }
}
/** GET /api/community/stream — live message feed */
router.get("/stream", (req, res) => {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.flushHeaders?.();
    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    const role = roleOf(req.user);
    const client = { id: ++clientSeq, res, staff: role !== "user" };
    clients.add(client);
    const ping = setInterval(() => {
        try {
            res.write(`: ping\n\n`);
        }
        catch { /* ignore */ }
    }, 25000);
    req.on("close", () => {
        clearInterval(ping);
        clients.delete(client);
    });
});
function shape(m) {
    return {
        _id: String(m._id),
        clientId: m.clientId || "",
        userId: String(m.userId),
        username: m.username,
        role: m.role,
        text: m.text,
        replyTo: m.replyTo ? String(m.replyTo) : null,
        replyToUsername: m.replyToUsername,
        replyToText: m.replyToText,
        hidden: Boolean(m.hidden),
        hiddenReason: m.hiddenReason || "",
        reportCount: m.reportCount || 0,
        createdAt: m.createdAt
    };
}
/** GET /api/community/messages?after=<iso>&limit=60 */
router.get("/messages", async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 60, 100);
        const after = typeof req.query.after === "string" ? new Date(req.query.after) : null;
        const role = roleOf(req.user);
        const query = { deleted: false };
        if (role === "user")
            query.hidden = { $ne: true };
        if (after && !isNaN(after.getTime()))
            query.createdAt = { $gt: after };
        const docs = await Message.find(query).sort({ createdAt: after ? 1 : -1 }).limit(limit).lean();
        const messages = (after ? docs : docs.reverse()).map((m) => shape(m));
        res.json({ messages, me: String(req.user._id), role });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
/** POST /api/community/messages */
router.post("/messages", async (req, res) => {
    try {
        const schema = z.object({
            text: z.string().trim().min(1).max(1000),
            replyTo: z.string().optional().nullable(),
            clientId: z.string().trim().max(80).optional().nullable()
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Message must be 1-1000 characters" });
            return;
        }
        const clientId = parsed.data.clientId || "";
        // Idempotency: a retry with the same clientId returns the original message.
        if (clientId) {
            const existing = await Message.findOne({ userId: req.user._id, clientId }).lean();
            if (existing) {
                res.json({ success: true, message: shape(existing) });
                return;
            }
        }
        // simple flood control: max 5 messages / 10s
        const since = new Date(Date.now() - 10_000);
        const recent = await Message.countDocuments({ userId: req.user._id, createdAt: { $gte: since } });
        if (recent >= 5) {
            res.status(429).json({ error: "Slow down a bit 🙂" });
            return;
        }
        const me = await User.findById(req.user._id).lean();
        if (!me) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        let replyToUsername = "";
        let replyToText = "";
        let replyId = null;
        if (parsed.data.replyTo) {
            const parent = await Message.findById(parsed.data.replyTo).lean();
            if (parent && !parent.deleted) {
                replyId = parent._id;
                replyToUsername = parent.username;
                replyToText = parent.text.slice(0, 140);
            }
        }
        const doc = await Message.create({
            userId: me._id,
            clientId,
            username: me.username || me.email.split("@")[0],
            role: roleOf(me),
            text: parsed.data.text,
            replyTo: replyId,
            replyToUsername,
            replyToText
        });
        const message = shape(doc.toObject());
        broadcast("message", message);
        res.json({ success: true, message });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
/** DELETE /api/community/messages/:id — author or staff */
router.delete("/messages/:id", async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) {
            res.status(404).json({ error: "Message not found" });
            return;
        }
        const role = roleOf(req.user);
        const isOwner = String(msg.userId) === String(req.user._id);
        if (!isOwner && role === "user") {
            res.status(403).json({ error: "Not allowed" });
            return;
        }
        msg.deleted = true;
        await msg.save();
        if (!isOwner) {
            await writeAudit({
                action: "community.delete_message",
                actorId: req.user._id,
                actorEmail: req.user.email,
                actorRole: role,
                targetId: msg._id,
                targetLabel: msg.username,
                meta: msg.text.slice(0, 140)
            });
        }
        broadcast("deleted", { _id: String(msg._id) });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
/** POST /api/community/messages/:id/report — any signed-in user */
router.post("/messages/:id/report", async (req, res) => {
    try {
        const schema = z.object({ reason: z.string().trim().max(300).optional() });
        const parsed = schema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid reason" });
            return;
        }
        const msg = await Message.findById(req.params.id);
        if (!msg || msg.deleted) {
            res.status(404).json({ error: "Message not found" });
            return;
        }
        if (String(msg.userId) === String(req.user._id)) {
            res.status(400).json({ error: "You cannot report your own message" });
            return;
        }
        const me = await User.findById(req.user._id).lean();
        try {
            await MessageReport.create({
                messageId: msg._id,
                messageText: msg.text.slice(0, 300),
                messageAuthor: msg.username,
                reporterId: req.user._id,
                reporterName: me?.username || "user",
                reason: parsed.data.reason || "Not specified"
            });
        }
        catch {
            res.status(409).json({ error: "You already reported this message" });
            return;
        }
        msg.reportCount = (msg.reportCount || 0) + 1;
        // Auto-hide once several distinct users flag the same message.
        if (msg.reportCount >= 3 && !msg.hidden) {
            msg.hidden = true;
            msg.hiddenBy = "auto";
            msg.hiddenReason = "Auto-hidden after multiple reports";
            broadcast("hidden", { _id: String(msg._id), hidden: true });
        }
        await msg.save();
        broadcast("report", { messageId: String(msg._id), reportCount: msg.reportCount }, true);
        res.json({ success: true, reportCount: msg.reportCount });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// MODERATION (staff only)
// ============================================================
/** PATCH /api/community/messages/:id/hide  { hidden: boolean, reason?: string } */
router.patch("/messages/:id/hide", staffGuard, async (req, res) => {
    try {
        const schema = z.object({ hidden: z.boolean(), reason: z.string().trim().max(200).optional() });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input" });
            return;
        }
        const msg = await Message.findById(req.params.id);
        if (!msg) {
            res.status(404).json({ error: "Message not found" });
            return;
        }
        const role = roleOf(req.user);
        const actorEmail = req.user.email;
        msg.hidden = parsed.data.hidden;
        msg.hiddenBy = parsed.data.hidden ? actorEmail : "";
        msg.hiddenReason = parsed.data.hidden ? (parsed.data.reason || "Hidden by moderator") : "";
        await msg.save();
        await writeAudit({
            action: parsed.data.hidden ? "community.hide_message" : "community.unhide_message",
            actorId: req.user._id,
            actorEmail,
            actorRole: role,
            targetId: msg._id,
            targetLabel: msg.username,
            meta: msg.hiddenReason || msg.text.slice(0, 140)
        });
        broadcast("hidden", { _id: String(msg._id), hidden: msg.hidden });
        res.json({ success: true, hidden: msg.hidden });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
/** GET /api/community/reports?status=open — sorted by priority (most-reported first) */
router.get("/reports", staffGuard, async (req, res) => {
    try {
        const status = typeof req.query.status === "string" ? req.query.status : "open";
        const filter = status === "all" ? {} : { status };
        const reports = await MessageReport.find(filter).sort({ createdAt: -1 }).limit(300).lean();
        const msgIds = [...new Set(reports.map((r) => String(r.messageId)))];
        const messages = await Message.find({ _id: { $in: msgIds } }, { reportCount: 1, hidden: 1, deleted: 1 }).lean();
        const byId = new Map(messages.map((m) => [String(m._id), m]));
        const shaped = reports.map((r) => {
            const m = byId.get(String(r.messageId));
            const count = m?.reportCount || 1;
            return {
                _id: String(r._id),
                messageId: String(r.messageId),
                messageText: r.messageText,
                messageAuthor: r.messageAuthor,
                reporterName: r.reporterName,
                reason: r.reason,
                status: r.status,
                handledBy: r.handledBy,
                reportCount: count,
                hidden: Boolean(m?.hidden),
                deleted: Boolean(m?.deleted),
                priority: count >= 3 ? "high" : count === 2 ? "medium" : "low",
                createdAt: r.createdAt
            };
        });
        const rank = { high: 0, medium: 1, low: 2 };
        shaped.sort((a, b) => rank[a.priority] - rank[b.priority] || +new Date(b.createdAt) - +new Date(a.createdAt));
        res.json({ reports: shaped, counts: {
                high: shaped.filter((r) => r.priority === "high").length,
                medium: shaped.filter((r) => r.priority === "medium").length,
                low: shaped.filter((r) => r.priority === "low").length
            } });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
/** POST /api/community/moderation/batch  { reportIds?, messageIds?, action } */
router.post("/moderation/batch", staffGuard, async (req, res) => {
    try {
        const schema = z.object({
            reportIds: z.array(z.string()).max(200).optional(),
            messageIds: z.array(z.string()).max(200).optional(),
            action: z.enum(["hide", "unhide", "delete", "reviewed", "dismiss"]),
            reason: z.string().trim().max(200).optional()
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input" });
            return;
        }
        const { reportIds = [], messageIds = [], action, reason } = parsed.data;
        const actorEmail = req.user.email;
        const role = roleOf(req.user);
        // Resolve message ids from reports when only reports were selected.
        let targets = [...messageIds];
        if (reportIds.length) {
            const reports = await MessageReport.find({ _id: { $in: reportIds } }).lean();
            targets = [...new Set([...targets, ...reports.map((r) => String(r.messageId))])];
        }
        let affected = 0;
        if (action === "hide" || action === "unhide") {
            const hidden = action === "hide";
            for (const id of targets) {
                const msg = await Message.findById(id);
                if (!msg)
                    continue;
                msg.hidden = hidden;
                msg.hiddenBy = hidden ? actorEmail : "";
                msg.hiddenReason = hidden ? (reason || "Hidden by moderator (batch)") : "";
                await msg.save();
                broadcast("hidden", { _id: String(msg._id), hidden });
                affected++;
            }
        }
        else if (action === "delete") {
            for (const id of targets) {
                const msg = await Message.findById(id);
                if (!msg)
                    continue;
                msg.deleted = true;
                await msg.save();
                broadcast("deleted", { _id: String(msg._id) });
                affected++;
            }
        }
        // Close out the selected reports.
        if (reportIds.length) {
            const nextStatus = action === "dismiss" ? "dismissed" : "resolved";
            await MessageReport.updateMany({ _id: { $in: reportIds } }, { $set: { status: nextStatus, handledBy: actorEmail } });
            if (action === "reviewed" || action === "dismiss")
                affected = reportIds.length;
        }
        await writeAudit({
            action: `community.batch_${action}`,
            actorId: req.user._id,
            actorEmail,
            actorRole: role,
            targetLabel: `${targets.length || reportIds.length} item(s)`,
            meta: reason || `batch ${action}`
        });
        res.json({ success: true, affected, action });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
/** PATCH /api/community/reports/:id  { status: "resolved" | "dismissed" } */
router.patch("/reports/:id", staffGuard, async (req, res) => {
    try {
        const schema = z.object({ status: z.enum(["resolved", "dismissed"]) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid status" });
            return;
        }
        const report = await MessageReport.findById(req.params.id);
        if (!report) {
            res.status(404).json({ error: "Report not found" });
            return;
        }
        const actorEmail = req.user.email;
        report.status = parsed.data.status;
        report.handledBy = actorEmail;
        await report.save();
        await writeAudit({
            action: `community.report_${parsed.data.status}`,
            actorId: req.user._id,
            actorEmail,
            actorRole: roleOf(req.user),
            targetId: report.messageId,
            targetLabel: report.messageAuthor,
            meta: report.reason
        });
        res.json({ success: true, status: report.status });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
export default router;
