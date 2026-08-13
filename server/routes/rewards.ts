import { Router } from "express";
import { z } from "zod";
import { RewardClaim, Achievement } from "../models/Reward.js";
import { User } from "../models/User.js";
import { Bot } from "../models/Bot.js";
import { Transaction } from "../models/Transaction.js";
import { Referral } from "../models/Referral.js";
import { Message } from "../models/Message.js";
import { getSetting } from "../models/AppSetting.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { superAdminGuard } from "../middleware/roleGuard.js";

const router = Router();

interface DailyConfig { enabled: boolean; amount: number; minBalance: number; cooldownHours: number }

async function dailyConfig(): Promise<DailyConfig> {
  const cfg = (await getSetting<DailyConfig>("dailyReward")) || { enabled: true, amount: 4, minBalance: 30, cooldownHours: 24 };
  return {
    enabled: cfg.enabled !== false,
    amount: Number(cfg.amount) || 4,
    minBalance: Number(cfg.minBalance) || 0,
    cooldownHours: Number(cfg.cooldownHours) || 24,
  };
}

async function metricValue(userId: string, metric: string, balance: number): Promise<number> {
  try {
    switch (metric) {
      case "deploys": return await Bot.countDocuments({ userId, status: { $ne: "deleted" } });
      case "topups": return await Transaction.countDocuments({ userId, type: "topup", status: "success" });
      case "referrals": return await Referral.countDocuments({ referrerId: userId });
      case "messages": return await Message.countDocuments({ userId, deleted: false });
      case "balance": return balance;
      default: return 0;
    }
  } catch { return 0; }
}

/** Daily reward + achievement progress for the signed-in user. */
router.get("/", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const cfg = await dailyConfig();
    const me = await User.findById(req.user!._id).lean();
    const balance = (me as unknown as { txCoins?: number })?.txCoins || 0;

    const last = await RewardClaim.findOne({ userId: req.user!._id, kind: "daily" }).sort({ claimedAt: -1 }).lean();
    const lastAt = last ? new Date((last as unknown as { claimedAt: Date }).claimedAt).getTime() : 0;
    const nextAt = lastAt ? lastAt + cfg.cooldownHours * 3600_000 : 0;
    const now = Date.now();
    const eligibleBalance = balance >= cfg.minBalance;

    const achievements = await Achievement.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();
    const claimedRows = await RewardClaim.find({ userId: req.user!._id, kind: "achievement" }).lean();
    const claimedKeys = new Set(claimedRows.map((r) => (r as unknown as { key: string }).key));

    const list = [];
    for (const a of achievements) {
      const ach = a as unknown as { key: string; title: string; description: string; icon: string; metric: string; target: number; rewardTx: number };
      const progress = await metricValue(String(req.user!._id), ach.metric, balance);
      list.push({
        key: ach.key,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        metric: ach.metric,
        target: ach.target,
        rewardTx: ach.rewardTx,
        progress: Math.min(progress, ach.target),
        completed: progress >= ach.target,
        claimed: claimedKeys.has(ach.key),
      });
    }

    res.json({
      daily: {
        enabled: cfg.enabled,
        amount: cfg.amount,
        minBalance: cfg.minBalance,
        cooldownHours: cfg.cooldownHours,
        balance,
        eligible: cfg.enabled && eligibleBalance && now >= nextAt,
        reason: !cfg.enabled ? "disabled" : !eligibleBalance ? "min_balance" : now < nextAt ? "cooldown" : "",
        nextClaimAt: nextAt ? new Date(nextAt).toISOString() : null,
        secondsLeft: nextAt > now ? Math.ceil((nextAt - now) / 1000) : 0,
      },
      achievements: list,
    });
  } catch {
    res.status(500).json({ error: "Could not load rewards" });
  }
});

/** Claim history: every daily reward and achievement payout for this user. */
router.get("/history", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const rows = await RewardClaim.find({ userId: req.user!._id }).sort({ claimedAt: -1 }).limit(200).lean();
    const achievements = await Achievement.find().lean();
    const titles = new Map(
      (achievements as unknown as { key: string; title: string; icon: string }[]).map((a) => [a.key, a])
    );
    const items = (rows as unknown as { _id: unknown; kind: string; key: string; amount: number; claimedAt: Date }[]).map((r) => {
      const ach = titles.get(r.key);
      return {
        id: String(r._id),
        kind: r.kind,
        key: r.key,
        title: r.kind === "daily" ? "Daily reward" : ach?.title || r.key,
        icon: r.kind === "daily" ? "gift" : ach?.icon || "trophy",
        amount: r.amount,
        claimedAt: r.claimedAt,
      };
    });
    const totalEarned = items.reduce((s, i) => s + (i.amount || 0), 0);
    res.json({ items, totalEarned, dailyCount: items.filter((i) => i.kind === "daily").length });
  } catch {
    res.status(500).json({ error: "Could not load reward history" });
  }
});

/** Claim the daily reward. */

router.post("/daily/claim", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const cfg = await dailyConfig();
    if (!cfg.enabled) { res.status(400).json({ error: "Daily reward is currently disabled" }); return; }

    const me = await User.findById(req.user!._id);
    if (!me) { res.status(404).json({ error: "Account not found" }); return; }
    if (me.txCoins < cfg.minBalance) {
      res.status(403).json({ error: `You need at least ${cfg.minBalance} SQ to claim the daily reward` });
      return;
    }

    const since = new Date(Date.now() - cfg.cooldownHours * 3600_000);
    const recent = await RewardClaim.findOne({ userId: me._id, kind: "daily", claimedAt: { $gt: since } }).lean();
    if (recent) {
      const nextAt = new Date(new Date((recent as unknown as { claimedAt: Date }).claimedAt).getTime() + cfg.cooldownHours * 3600_000);
      res.status(429).json({ error: "Daily reward already claimed", nextClaimAt: nextAt.toISOString() });
      return;
    }

    await RewardClaim.create({ userId: me._id, kind: "daily", key: "daily", amount: cfg.amount });
    me.txCoins += cfg.amount;
    await me.save();
    await Transaction.create({ userId: me._id, type: "admin_grant", txAmount: cfg.amount, tzsAmount: 0, status: "success" });

    res.json({ ok: true, amount: cfg.amount, newBalance: me.txCoins, nextClaimAt: new Date(Date.now() + cfg.cooldownHours * 3600_000).toISOString() });
  } catch {
    res.status(500).json({ error: "Could not claim reward" });
  }
});

/** Claim a completed achievement (once per user). */
router.post("/achievements/:key/claim", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const ach = await Achievement.findOne({ key: req.params.key, active: true }).lean();
    if (!ach) { res.status(404).json({ error: "Achievement not found" }); return; }
    const a = ach as unknown as { key: string; metric: string; target: number; rewardTx: number };

    const me = await User.findById(req.user!._id);
    if (!me) { res.status(404).json({ error: "Account not found" }); return; }

    const progress = await metricValue(String(me._id), a.metric, me.txCoins);
    if (progress < a.target) { res.status(400).json({ error: "Achievement not completed yet" }); return; }

    try {
      await RewardClaim.create({ userId: me._id, kind: "achievement", key: a.key, amount: a.rewardTx });
    } catch {
      res.status(400).json({ error: "You already claimed this achievement" });
      return;
    }

    me.txCoins += a.rewardTx;
    await me.save();
    await Transaction.create({ userId: me._id, type: "admin_grant", txAmount: a.rewardTx, tzsAmount: 0, status: "success" });
    res.json({ ok: true, amount: a.rewardTx, newBalance: me.txCoins });
  } catch {
    res.status(500).json({ error: "Could not claim achievement" });
  }
});

// ===== Admin achievement management =====
const achSchema = z.object({
  key: z.string().min(2).regex(/^[a-z0-9_-]+$/),
  title: z.string().min(2),
  description: z.string().default(""),
  icon: z.string().default("trophy"),
  metric: z.enum(["deploys", "topups", "referrals", "messages", "balance"]),
  target: z.number().min(1),
  rewardTx: z.number().min(0),
  active: z.boolean().default(true),
  order: z.number().default(0),
});

router.get("/admin/achievements", authGuard, superAdminGuard, async (_req, res) => {
  res.json(await Achievement.find().sort({ order: 1, createdAt: 1 }).lean());
});

router.post("/admin/achievements", authGuard, superAdminGuard, async (req, res) => {
  const parsed = achSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  try {
    const created = await Achievement.create(parsed.data);
    res.json(created);
  } catch {
    res.status(400).json({ error: "An achievement with that key already exists" });
  }
});

router.patch("/admin/achievements/:id", authGuard, superAdminGuard, async (req, res) => {
  const parsed = achSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const updated = await Achievement.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/achievements/:id", authGuard, superAdminGuard, async (req, res) => {
  await Achievement.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
