import { Router } from "express";
import { AppSetting, getSettings, DEFAULT_SETTINGS } from "../models/AppSetting.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { superAdminGuard } from "../middleware/roleGuard.js";
import { writeAudit } from "../models/AuditLog.js";

const router = Router();

/** Public settings used by the app shell (logo, popup, prices). */
router.get("/", async (_req, res) => {
  try {
    const s = await getSettings();
    res.json(s);
  } catch {
    res.json(DEFAULT_SETTINGS);
  }
});

/** Admin: update one or many settings. */
router.put("/", authGuard, superAdminGuard, async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== "object") { res.status(400).json({ error: "Invalid payload" }); return; }
    const allowed = Object.keys(DEFAULT_SETTINGS);
    const updates = Object.entries(body).filter(([k]) => allowed.includes(k));
    if (updates.length === 0) { res.status(400).json({ error: "No valid settings provided" }); return; }
    const before = await getSettings();
    for (const [key, value] of updates) {
      await AppSetting.findOneAndUpdate(
        { key },
        { key, value, updatedAt: new Date(), updatedBy: req.user!.email },
        { upsert: true }
      );
    }
    const after = await getSettings();
    for (const [key] of updates) {
      const wasMaintenance = key === "maintenance";
      writeAudit({
        action: wasMaintenance ? "settings.maintenance" : "settings.update",
        actorId: req.user!._id,
        actorEmail: (req.user as unknown as { email: string }).email,
        actorRole: "admin",
        targetLabel: key,
        before: JSON.stringify(before[key] ?? null).slice(0, 500),
        after: JSON.stringify(after[key] ?? null).slice(0, 500),
        ip: (req.headers["x-forwarded-for"] as string) || req.ip || "",
      }).catch(() => {});
    }
    res.json(after);
  } catch {
    res.status(500).json({ error: "Could not save settings" });
  }
});

export default router;
