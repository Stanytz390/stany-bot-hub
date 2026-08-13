import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { ApiKey, ApiUsage } from "../models/ApiKey.js";
import { User } from "../models/User.js";
import { Bot } from "../models/Bot.js";
import { Transaction } from "../models/Transaction.js";
import { restartApp, getAppStatus, getAppLogs } from "../services/heroku.js";
import { SmmService, SmmOrder } from "../models/Smm.js";
import { createSmmOrder, refreshOrderStatus, mapOrder } from "./smm.js";

const router = Router();

/** SQ charged per endpoint. Anything not listed falls back to DEFAULT_COST. */
const DEFAULT_COST = 1;
const COSTS: Record<string, number> = {
  "GET /v1/me": 1,
  "GET /v1/balance": 1,
  "GET /v1/bots": 1,
  "GET /v1/bots/:id": 1,
  "GET /v1/bots/:id/logs": 2,
  "POST /v1/bots/:id/restart": 3,
  "GET /v1/services": 0,
  "GET /v1/services/order/:id": 0,
};

interface ApiRequest extends Request {
  apiKeyDoc?: { _id: unknown; userId: unknown };
  apiUserId?: unknown;
  apiCost?: number;
}

/**
 * Key auth + SQ metering. The call is rejected with 402 when the owner has no
 * SQ left, so integrations stop working the moment the balance hits zero.
 */
async function meter(req: ApiRequest, res: Response, next: NextFunction) {
  const raw = (req.headers["x-api-key"] as string) || req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  const key = raw.trim();
  if (!key) { res.status(401).json({ error: "Missing API key. Send it in the x-api-key header." }); return; }
  if (!key.startsWith("STANY-")) { res.status(401).json({ error: "Invalid API key format. Keys start with STANY-." }); return; }

  const doc = await ApiKey.findOne({ key });
  if (!doc) { res.status(401).json({ error: "Unknown API key" }); return; }
  if (!doc.active) { res.status(403).json({ error: "This API key is disabled" }); return; }

  const owner = await User.findById(doc.userId);
  if (!owner) { res.status(401).json({ error: "Key owner not found" }); return; }
  if ((owner as unknown as { isBanned?: boolean }).isBanned) { res.status(403).json({ error: "Account suspended" }); return; }

  const routeKey = `${req.method} /v1${req.route?.path ?? ""}`;
  const cost = COSTS[routeKey] ?? DEFAULT_COST;

  // Atomic debit — no SQ, no service.
  const debited = await User.findOneAndUpdate(
    { _id: owner._id, txCoins: { $gte: cost } },
    { $inc: { txCoins: -cost } },
    { new: true }
  );
  if (!debited) {
    res.status(402).json({ error: "Insufficient SQ balance. Top up to keep using the Stany API.", required: cost, balance: owner.txCoins });
    return;
  }

  await ApiKey.updateOne({ _id: doc._id }, { $inc: { callCount: 1, sqSpent: cost }, $set: { lastUsedAt: new Date() } });
  await ApiUsage.create({ keyId: doc._id, userId: owner._id, endpoint: routeKey, method: req.method, cost, status: 200 });
  await Transaction.create({ userId: owner._id, type: "api_usage", txAmount: cost, tzsAmount: 0, status: "success" }).catch(() => {});

  req.apiKeyDoc = doc;
  req.apiUserId = owner._id;
  req.apiCost = cost;
  res.setHeader("X-SQ-Charged", String(cost));
  res.setHeader("X-SQ-Balance", String(debited.txCoins));
  next();
}

router.get("/me", meter, async (req: ApiRequest, res) => {
  const u = await User.findById(req.apiUserId).lean();
  res.json({
    id: String(u!._id),
    username: (u as unknown as { username?: string })?.username || "",
    email: u!.email,
    balance: u!.txCoins,
    charged: req.apiCost,
  });
});

router.get("/balance", meter, async (req: ApiRequest, res) => {
  const u = await User.findById(req.apiUserId).lean();
  res.json({ balance: u!.txCoins, currency: "SQ", charged: req.apiCost });
});

router.get("/bots", meter, async (req: ApiRequest, res) => {
  const bots = await Bot.find({ userId: req.apiUserId, status: { $ne: "deleted" } }).sort({ deployedAt: -1 }).lean();
  res.json({
    bots: bots.map((b) => ({
      id: String(b._id),
      name: b.herokuAppName,
      phone: b.phoneNumber,
      status: b.status,
      deployedAt: b.deployedAt,
      expiresAt: b.expiresAt,
    })),
    charged: req.apiCost,
  });
});

router.get("/bots/:id", meter, async (req: ApiRequest, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.apiUserId }).lean();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const live = await getAppStatus(bot.herokuAppName).catch(() => "unknown");
  res.json({ id: String(bot._id), name: bot.herokuAppName, status: bot.status, liveStatus: live, expiresAt: bot.expiresAt, charged: req.apiCost });
});

router.get("/bots/:id/logs", meter, async (req: ApiRequest, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.apiUserId }).lean();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const logs = await getAppLogs(bot.herokuAppName).catch(() => "");
  res.json({ logs, charged: req.apiCost });
});

router.post("/bots/:id/restart", meter, async (req: ApiRequest, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.apiUserId }).lean();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const ok = await restartApp(bot.herokuAppName).catch(() => false);
  res.json({ ok, charged: req.apiCost });
});

// ===================== SOCIAL MEDIA BOOSTING =====================

/** Full catalogue, priced in SQ. Free call. */
router.get("/services", meter, async (req: ApiRequest, res) => {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  const filter: Record<string, unknown> = { active: true };
  if (category) filter.category = new RegExp(`^${category}$`, "i");
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { category: new RegExp(q, "i") }];
  const services = await SmmService.find(filter).sort({ category: 1, name: 1 }).limit(2000).lean();
  const me = await User.findById(req.apiUserId).lean();
  res.json({
    success: true,
    data: services.map((s) => {
      const v = s as unknown as Record<string, unknown>;
      return {
        id: v.serviceId,
        name: v.name,
        category: v.category,
        provider: v.provider,
        price_per_1000_sq: v.pricePer1000Sq,
        min: v.min,
        max: v.max,
      };
    }),
    balance_after: me!.txCoins,
    charged_sq: req.apiCost,
  });
});

/** Place a real boosting order. SQ is refunded automatically if it fails upstream. */
router.post("/services/order", meter, async (req: ApiRequest, res) => {
  const serviceId = Number(req.body?.service_id);
  const link = String(req.body?.link || "");
  const quantity = Number(req.body?.quantity);
  const provider = req.body?.provider ? String(req.body.provider) : undefined;
  if (!serviceId || !link || !quantity) {
    res.status(400).json({ success: false, error: "service_id, link and quantity are required" });
    return;
  }
  const result = await createSmmOrder({ userId: String(req.apiUserId), serviceId, provider, link, quantity, source: "api" });
  if (!result.ok) { res.status(result.status).json({ success: false, error: result.error }); return; }
  res.json({ success: true, data: result.order, balance_after: result.balance, charged_sq: result.cost });
});

/** Order status. Free call. */
router.get("/services/order/:id", meter, async (req: ApiRequest, res) => {
  const order = await SmmOrder.findOne({ _id: req.params.id, userId: req.apiUserId });
  if (!order) { res.status(404).json({ success: false, error: "Order not found" }); return; }
  await refreshOrderStatus(order as never).catch(() => {});
  const me = await User.findById(req.apiUserId).lean();
  res.json({ success: true, data: mapOrder(order.toObject()), balance_after: me!.txCoins, charged_sq: req.apiCost });
});

export default router;
