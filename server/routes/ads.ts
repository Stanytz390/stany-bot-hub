import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Ad, AD_PLATFORMS, DEFAULT_AD_LABELS, type AdPlatform } from "../models/Ad.js";
import { User } from "../models/User.js";

const router = Router();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "stanytzhosting@gmail.com";

async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token =
    (req as Request & { cookies?: Record<string, string> }).cookies?.token ||
    req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { userId: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user || user.email !== ADMIN_EMAIL) { res.status(403).json({ error: "Forbidden" }); return; }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function labelFor(platform: AdPlatform, custom?: string): string {
  return (custom && custom.trim()) || DEFAULT_AD_LABELS[platform] || "Open Link";
}

// PUBLIC: active banners for the sliding ads area
router.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const ads = await Ad.find({
      active: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      ],
    }).sort({ order: 1, createdAt: -1 }).lean();
    res.json(
      ads.map((a) => ({
        _id: a._id,
        title: a.title,
        subtitle: a.subtitle,
        imageUrl: a.imageUrl,
        targetUrl: a.targetUrl,
        platform: a.platform,
        buttonLabel: labelFor(a.platform as AdPlatform, a.buttonLabel),
        displaySeconds: a.displaySeconds || 0,
        endsAt: a.endsAt || null,
      }))
    );
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// PUBLIC: click tracking
router.post("/:id/click", async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

router.post("/:id/impression", async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// ADMIN
router.get("/admin/all", adminAuth, async (_req, res) => {
  const ads = await Ad.find().sort({ order: 1, createdAt: -1 }).lean();
  res.json(ads);
});

const adSchema = z.object({
  title: z.string().min(2).max(80),
  subtitle: z.string().max(140).optional(),
  imageUrl: z.string().url(),
  targetUrl: z.string().url(),
  platform: z.enum(AD_PLATFORMS),
  buttonLabel: z.string().max(30).optional(),
  order: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional().or(z.literal("")),
  endsAt: z.string().datetime().nullable().optional().or(z.literal("")),
  displaySeconds: z.number().int().min(0).max(600).optional(),
});

/** Turn "" into null so admins can clear a schedule. */
function normalizeDates<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data } as Record<string, unknown>;
  for (const key of ["startsAt", "endsAt"]) {
    if (key in out) out[key] = out[key] ? new Date(out[key] as string) : null;
  }
  return out as T;
}

router.post("/admin", adminAuth, async (req, res) => {
  const parsed = adSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid banner data" }); return; }
  const ad = await Ad.create(normalizeDates(parsed.data));
  res.json(ad);
});

router.patch("/admin/:id", adminAuth, async (req, res) => {
  const parsed = adSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid banner data" }); return; }
  const ad = await Ad.findByIdAndUpdate(req.params.id, { $set: normalizeDates(parsed.data) }, { new: true });
  res.json(ad);
});

router.delete("/admin/:id", adminAuth, async (req, res) => {
  await Ad.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Bulk actions (mark all / select many)
router.post("/admin/bulk", adminAuth, async (req, res) => {
  const schema = z.object({
    ids: z.array(z.string()).min(1),
    action: z.enum(["activate", "deactivate", "delete"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid bulk request" }); return; }
  const { ids, action } = parsed.data;
  if (action === "delete") {
    const r = await Ad.deleteMany({ _id: { $in: ids } });
    res.json({ ok: true, affected: r.deletedCount });
    return;
  }
  const r = await Ad.updateMany({ _id: { $in: ids } }, { $set: { active: action === "activate" } });
  res.json({ ok: true, affected: r.modifiedCount });
});

export default router;
