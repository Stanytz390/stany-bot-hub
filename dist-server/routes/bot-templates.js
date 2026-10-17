import { Router } from "express";
import { z } from "zod";
import { BotTemplate } from "../models/BotTemplate.js";
import { Bot } from "../models/Bot.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { writeAudit } from "../models/AuditLog.js";
const router = Router();
const ADMIN_EMAIL = "stanytzhosting@gmail.com";
async function adminAuth(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
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
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
router.get("/", authGuard, banCheck, async (_req, res) => {
    try {
        const templates = await BotTemplate.find({ active: true }).sort({ isDefault: -1, order: 1, createdAt: 1 }).lean();
        const templateIds = templates.map(t => t._id.toString());
        let counts = [];
        try {
            counts = await Bot.aggregate([
                { $match: { templateId: { $in: templateIds }, status: { $ne: "deleted" } } },
                { $group: { _id: "$templateId", count: { $sum: 1 } } }
            ]);
        }
        catch { }
        const countMap = {};
        for (const c of counts)
            countMap[c._id] = c.count;
        res.json(templates.map(t => ({ ...t, deployCount: countMap[t._id.toString()] || 0 })));
    }
    catch {
        res.json([
            {
                _id: "default-mdinyane",
                name: "MdinyaneV2",
                githubRepo: "Stanytz378/mdinyane",
                sessionIdUrl: "https://session-id-generator-4xuy.onrender.com/",
                costTx: 0,
                isDefault: true,
                active: true,
                shareableSlug: "mdinyane-md",
                imageUrl: "https://url.bmbxmd.workers.dev/utamu.jpeg",
                deployCount: 0
            }
        ]);
    }
});
router.get("/slug/:slug", async (req, res) => {
    try {
        const template = await BotTemplate.findOne({ shareableSlug: req.params.slug, active: true }).lean();
        if (!template) {
            if (req.params.slug === "mdinyane-md") {
                res.json({
                    _id: "default-mdinyane",
                    name: "MdinyaneV2",
                    githubRepo: "Stanytz378/mdinyane",
                    sessionIdUrl: "https://session-id-generator-4xuy.onrender.com/",
                    costTx: 0,
                    isDefault: true,
                    active: true,
                    shareableSlug: "mdinyane-md",
                    imageUrl: "https://url.bmbxmd.workers.dev/utamu.jpeg"
                });
                return;
            }
            res.status(404).json({ error: "Bot not found" });
            return;
        }
        res.json(template);
    }
    catch {
        if (req.params.slug === "mdinyane-md") {
            res.json({
                _id: "default-mdinyane",
                name: "MdinyaneV2",
                githubRepo: "Stanytz378/mdinyane",
                sessionIdUrl: "https://session-id-generator-4xuy.onrender.com/",
                costTx: 0,
                isDefault: true,
                active: true,
                shareableSlug: "mdinyane-md",
                imageUrl: "https://url.bmbxmd.workers.dev/utamu.jpeg"
            });
            return;
        }
        res.status(500).json({ error: "Server error" });
    }
});
const addSchema = z.object({
    name: z.string().min(2),
    githubRepo: z.string().url(),
    sessionIdUrl: z.string().url(),
    costTx: z.number().min(0).default(10)
});
async function fetchAppJson(repoUrl) {
    try {
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match)
            return { imageUrl: "" };
        const [, owner, repo] = match;
        const cleanRepo = repo.replace(/\.git$/, "");
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/app.json`;
        const res = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) });
        if (!res.ok)
            return { imageUrl: "" };
        const data = await res.json();
        const imageUrl = data.logo || data.image || "";
        return { imageUrl };
    }
    catch {
        return { imageUrl: "" };
    }
}
function makeSlug(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${base}-${rand}`;
}
router.post("/", adminAuth, async (req, res) => {
    try {
        const parsed = addSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
            return;
        }
        const { name, githubRepo, sessionIdUrl, costTx } = parsed.data;
        const { imageUrl } = await fetchAppJson(githubRepo);
        const shareableSlug = makeSlug(name);
        const count = await BotTemplate.countDocuments();
        const template = await BotTemplate.create({
            name, githubRepo, sessionIdUrl, imageUrl, shareableSlug, costTx,
            isDefault: false, active: true, order: count
        });
        writeAudit({
            action: "template.create",
            actorId: req.user?._id,
            actorEmail: req.user?.email || "",
            actorRole: "admin",
            targetId: template._id,
            targetLabel: template.name,
            after: `${githubRepo} · ${costTx} SQ`,
            ip: req.headers["x-forwarded-for"] || req.ip || "",
        }).catch(() => { });
        res.json({ ok: true, template });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
const editSchema = z.object({
    name: z.string().min(2).optional(),
    githubRepo: z.string().url().optional(),
    sessionIdUrl: z.string().url().optional(),
    imageUrl: z.string().optional(),
    description: z.string().optional(),
    costTx: z.number().min(0).optional(),
    active: z.boolean().optional(),
    order: z.number().optional(),
    offerActive: z.boolean().optional(),
    offerDays: z.number().min(1).max(60).optional(),
    offerLabel: z.string().optional(),
    offerEndsAt: z.string().nullable().optional(),
});
/** Admin: edit a bot template, including the free-offer window. */
router.patch("/:id", adminAuth, async (req, res) => {
    try {
        const parsed = editSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
            return;
        }
        const data = parsed.data;
        const update = { ...data };
        if ("offerEndsAt" in data) {
            update.offerEndsAt = data.offerEndsAt ? new Date(data.offerEndsAt) : null;
        }
        const previous = await BotTemplate.findById(req.params.id).lean();
        const template = await BotTemplate.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!template) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const prev = previous;
        const offerTouched = "offerActive" in data || "offerDays" in data || "offerEndsAt" in data || "offerLabel" in data;
        writeAudit({
            action: offerTouched ? "template.offer" : "template.update",
            actorId: req.user?._id,
            actorEmail: req.user?.email || "",
            actorRole: "admin",
            targetId: template._id,
            targetLabel: template.name,
            before: `offer:${prev?.offerActive ? "on" : "off"} days:${prev?.offerDays ?? "-"} cost:${prev?.costTx ?? "-"} active:${prev?.active}`,
            after: `offer:${template.offerActive ? "on" : "off"} days:${template.offerDays ?? "-"} cost:${template.costTx} active:${template.active}`,
            ip: req.headers["x-forwarded-for"] || req.ip || "",
        }).catch(() => { });
        res.json(template);
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
/** Admin: full list, including inactive templates. */
router.get("/admin/all", adminAuth, async (_req, res) => {
    try {
        res.json(await BotTemplate.find().sort({ order: 1, createdAt: 1 }).lean());
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
router.delete("/:id", adminAuth, async (req, res) => {
    try {
        const template = await BotTemplate.findById(req.params.id);
        if (!template) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        if (template.isDefault) {
            res.status(400).json({ error: "Cannot remove the default bot" });
            return;
        }
        await BotTemplate.findByIdAndDelete(req.params.id);
        writeAudit({
            action: "template.delete",
            actorId: req.user?._id,
            actorEmail: req.user?.email || "",
            actorRole: "admin",
            targetId: template._id,
            targetLabel: template.name,
            ip: req.headers["x-forwarded-for"] || req.ip || "",
        }).catch(() => { });
        res.json({ ok: true });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
router.post("/:id/refresh-image", adminAuth, async (req, res) => {
    try {
        const template = await BotTemplate.findById(req.params.id);
        if (!template) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const { imageUrl } = await fetchAppJson(template.githubRepo);
        template.imageUrl = imageUrl;
        await template.save();
        res.json({ ok: true, imageUrl });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
export default router;
