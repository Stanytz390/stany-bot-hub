import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";
import { Backup } from "../models/Backup.js";
import { User } from "../models/User.js";

const router = Router();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "stanytzhosting@gmail.com";

// Collections that are safe / useful to snapshot.
const BACKUP_COLLECTIONS = [
  "users", "bots", "panels", "transactions", "coupons", "referrals",
  "packages", "panelplans", "bottemplates", "tutorials", "ads",
  "coinlinks", "manualpayments", "teams",
];

const MAX_DOC_BYTES = 15 * 1024 * 1024; // stay under Mongo's 16MB doc limit

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

function db() {
  const conn = mongoose.connection.db;
  if (!conn) throw new Error("Database not connected");
  return conn;
}

// LIST backups (metadata only)
router.get("/", adminAuth, async (_req, res) => {
  try {
    const rows = await Backup.find({}, { payload: 0 }).sort({ createdAt: -1 }).lean();
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// DB overview
router.get("/collections", adminAuth, async (_req, res) => {
  try {
    const out: { name: string; count: number }[] = [];
    for (const name of BACKUP_COLLECTIONS) {
      try {
        out.push({ name, count: await db().collection(name).countDocuments() });
      } catch {
        /* collection missing */
      }
    }
    res.json(out);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE backup
router.post("/", adminAuth, async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().max(60).optional(),
      collections: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

    const wanted = (parsed.data.collections?.length ? parsed.data.collections : BACKUP_COLLECTIONS)
      .filter((c) => BACKUP_COLLECTIONS.includes(c));

    const dump: Record<string, unknown[]> = {};
    const meta: { name: string; count: number }[] = [];
    let total = 0;

    for (const name of wanted) {
      try {
        const docs = await db().collection(name).find({}).toArray();
        dump[name] = docs;
        meta.push({ name, count: docs.length });
        total += docs.length;
      } catch {
        /* skip missing collection */
      }
    }

    const payload = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data: dump });
    const sizeBytes = Buffer.byteLength(payload, "utf8");
    if (sizeBytes > MAX_DOC_BYTES) {
      res.status(413).json({ error: "Backup too large to store in database. Select fewer collections and download instead." });
      return;
    }

    const backup = await Backup.create({
      name: parsed.data.name || `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`,
      collections: meta,
      totalDocuments: total,
      sizeBytes,
      payload,
    });

    res.json({ ok: true, id: backup._id, name: backup.name, totalDocuments: total, sizeBytes, collections: meta });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Backup failed" });
  }
});

// DOWNLOAD backup as JSON file
router.get("/:id/download", adminAuth, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id).lean();
    if (!backup) { res.status(404).json({ error: "Backup not found" }); return; }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${backup.name}.json"`);
    res.send(backup.payload);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// RESTORE a backup (upsert by _id, never drops data)
router.post("/:id/restore", adminAuth, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id).lean();
    if (!backup?.payload) { res.status(404).json({ error: "Backup not found" }); return; }
    const parsed = JSON.parse(backup.payload) as { data: Record<string, Record<string, unknown>[]> };

    const restored: { name: string; count: number }[] = [];
    for (const [name, docs] of Object.entries(parsed.data || {})) {
      if (!BACKUP_COLLECTIONS.includes(name) || !Array.isArray(docs) || docs.length === 0) continue;
      const col = db().collection(name);
      const ops = docs.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      }));
      await col.bulkWrite(ops as unknown as Parameters<typeof col.bulkWrite>[0], { ordered: false }).catch(() => null);
      restored.push({ name, count: docs.length });
    }
    res.json({ ok: true, restored });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Restore failed" });
  }
});

// DELETE (single or bulk)
router.post("/delete", adminAuth, async (req, res) => {
  const schema = z.object({ ids: z.array(z.string()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const r = await Backup.deleteMany({ _id: { $in: parsed.data.ids } });
  res.json({ ok: true, affected: r.deletedCount });
});

export default router;
