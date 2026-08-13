import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { Coupon } from "../models/Coupon.js";
import { Transaction } from "../models/Transaction.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { staffGuard, superAdminGuard, roleOf, SUPER_ADMIN_EMAIL } from "../middleware/roleGuard.js";
import { AuditLog, writeAudit } from "../models/AuditLog.js";


const router = Router();

router.use(authGuard);

/** Who am I (role info for the UI). */
router.get("/me", (req: AuthRequest, res) => {
  res.json({ role: roleOf(req.user as never), superAdminEmail: SUPER_ADMIN_EMAIL });
});

router.use(staffGuard);

/** Users list — limited fields only (sub-admins may only see SQ-related data). */
router.get("/users", async (req: AuthRequest, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const filter = q
      ? { $or: [{ username: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] }
      : {};
    const users = await User.find(filter, { email: 1, username: 1, txCoins: 1, role: 1, isBanned: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({
      users: users.map((u) => ({
        _id: String(u._id),
        email: u.email,
        username: (u as unknown as { username?: string }).username || "",
        txCoins: u.txCoins,
        role: roleOf(u as never),
        isBanned: u.isBanned,
        createdAt: u.createdAt
      }))
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/** Grant SQ coins to a user (staff). */
router.post("/grant-sq", async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      username: z.string().trim().min(1),
      amount: z.number().int().min(1).max(5000),
      reason: z.string().max(200).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input (1-5000 SQ)" }); return; }
    const { username, amount } = parsed.data;
    const target = username.includes("@")
      ? await User.findOne({ email: username.toLowerCase() })
      : await User.findOne({ username: username.toLowerCase() });
    if (!target) { res.status(404).json({ error: "User not found" }); return; }

    target.txCoins += amount;
    await target.save();
    await Transaction.create({
      userId: target._id,
      type: "admin_grant",
      txAmount: amount,
      tzsAmount: 0,
      status: "success"
    });
    res.json({ success: true, message: `Granted ${amount} SQ to ${username}`, newBalance: target.txCoins });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/** Coupons / redeem codes (staff). */
router.get("/coupons", async (_req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ coupons });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/coupons", async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      code: z.string().trim().min(3).max(24).optional(),
      txAmount: z.number().int().min(1).max(5000),
      quantity: z.number().int().min(1).max(50).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid coupon data" }); return; }
    const qty = parsed.data.quantity || 1;
    const created: string[] = [];
    for (let i = 0; i < qty; i++) {
      const code = (parsed.data.code && qty === 1
        ? parsed.data.code
        : `SQ${Math.random().toString(36).slice(2, 8)}`).toUpperCase();
      try {
        await Coupon.create({ code, txAmount: parsed.data.txAmount });
        created.push(code);
      } catch { /* duplicate — skip */ }
    }
    if (!created.length) { res.status(409).json({ error: "Coupon code already exists" }); return; }
    res.json({ success: true, codes: created });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/coupons/bulk-delete", async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ ids: z.array(z.string()).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    await Coupon.deleteMany({ _id: { $in: parsed.data.ids } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/** Audit log — role changes and moderation actions, with search + pagination. */
router.get("/audit", async (req: AuthRequest, res) => {
  try {
    const action = typeof req.query.action === "string" && req.query.action !== "all" ? req.query.action : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const actor = typeof req.query.actor === "string" ? req.query.actor.trim() : "";
    const from = typeof req.query.from === "string" && req.query.from ? new Date(req.query.from) : null;
    const to = typeof req.query.to === "string" && req.query.to ? new Date(req.query.to) : null;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));

    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (actor) filter.actorEmail = { $regex: actor, $options: "i" };
    if (q) {
      filter.$or = [
        { action: { $regex: q, $options: "i" } },
        { actorEmail: { $regex: q, $options: "i" } },
        { targetLabel: { $regex: q, $options: "i" } },
        { meta: { $regex: q, $options: "i" } }
      ];
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && !isNaN(from.getTime())) range.$gte = from;
      if (to && !isNaN(to.getTime())) range.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000);
      if (Object.keys(range).length) filter.createdAt = range;
    }

    const [logs, total, actions] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
      AuditLog.distinct("action")
    ]);

    res.json({
      logs: logs.map((l) => ({
        _id: String(l._id),
        action: l.action,
        actorEmail: l.actorEmail,
        actorRole: l.actorRole,
        targetLabel: l.targetLabel,
        before: l.before,
        after: l.after,
        meta: l.meta,
        ip: l.ip,
        createdAt: l.createdAt
      })),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      actions
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


/** Role management — SUPER ADMIN ONLY. */
router.patch("/users/:id/role", superAdminGuard, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ role: z.enum(["user", "subadmin", "admin"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid role" }); return; }
    const target = await User.findById(req.params.id);
    if (!target) { res.status(404).json({ error: "User not found" }); return; }
    if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
      res.status(400).json({ error: "Owner role cannot be changed" });
      return;
    }
    const previousRole = roleOf(target as never);
    target.set("role", parsed.data.role);
    await target.save();

    await writeAudit({
      action: "user.role_change",
      actorId: req.user!._id,
      actorEmail: (req.user as unknown as { email: string }).email,
      actorRole: roleOf(req.user as never),
      targetId: target._id,
      targetLabel: target.email,
      before: previousRole,
      after: parsed.data.role,
      ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || ""
    });

    res.json({ success: true, role: parsed.data.role });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

