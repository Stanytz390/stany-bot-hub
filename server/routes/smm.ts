import { Router } from "express";
import { z } from "zod";
import { SmmService, SmmOrder } from "../models/Smm.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { writeAudit } from "../models/AuditLog.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { adminGuard } from "../middleware/admin.js";
import { fetchRemoteServices, placeRemoteOrder, fetchRemoteStatus, normalizeStatus, providerConfigured } from "../services/smm.js";
import { logger } from "../logger.js";

const router = Router();

/** SQ cost of an order, always rounded up so we never undercharge. */
export function orderCost(pricePer1000Sq: number, quantity: number): number {
  return Math.max(1, Math.ceil((pricePer1000Sq * quantity) / 1000));
}

export interface PlacedOrder {
  _id: string;
  status: string;
  cost: number;
  balance: number;
}

/**
 * Shared order pipeline used by both the web UI and the public API:
 * debit SQ -> hand to the provider -> refund automatically if it rejects.
 */
export async function createSmmOrder(opts: {
  userId: string;
  serviceId: number;
  provider?: string;
  link: string;
  quantity: number;
  source: "web" | "api";
}): Promise<{ ok: true; order: Record<string, unknown>; cost: number; balance: number } | { ok: false; status: number; error: string }> {
  const svc = await SmmService.findOne({
    serviceId: opts.serviceId,
    active: true,
    ...(opts.provider ? { provider: opts.provider } : {})
  }).lean();
  if (!svc) return { ok: false, status: 404, error: "Service not found" };

  const s = svc as unknown as { _id: unknown; serviceId: number; provider: string; name: string; pricePer1000Sq: number; min: number; max: number };
  if (opts.quantity < s.min || opts.quantity > s.max) {
    return { ok: false, status: 400, error: `Quantity must be between ${s.min} and ${s.max}` };
  }

  const cost = orderCost(s.pricePer1000Sq, opts.quantity);

  // Atomic debit — the order is only attempted when the SQ is actually reserved.
  const debited = await User.findOneAndUpdate(
    { _id: opts.userId, txCoins: { $gte: cost } },
    { $inc: { txCoins: -cost } },
    { new: true }
  );
  if (!debited) return { ok: false, status: 402, error: "Insufficient SQ balance. Top up to place this order." };

  const order = await SmmOrder.create({
    userId: opts.userId,
    serviceRef: s._id,
    serviceId: s.serviceId,
    provider: s.provider,
    serviceName: s.name,
    link: opts.link,
    quantity: opts.quantity,
    priceSq: cost,
    source: opts.source,
    status: "pending"
  });

  await Transaction.create({
    userId: opts.userId,
    type: "smm",
    txAmount: cost,
    tzsAmount: 0,
    status: "success",
    itemName: `${s.name} x${opts.quantity}`,
    reference: String(order._id)
  }).catch(() => {});

  if (providerConfigured()) {
    const remote = await placeRemoteOrder(s.serviceId, opts.link, opts.quantity);
    if (!remote || remote.error || !remote.order) {
      // Upstream refused — give the SQ straight back.
      await User.updateOne({ _id: opts.userId }, { $inc: { txCoins: cost } });
      order.status = "refunded";
      order.refunded = true;
      order.note = remote?.error || "Provider rejected the order";
      order.updatedAt = new Date();
      await order.save();
      await Transaction.create({
        userId: opts.userId, type: "refund", txAmount: cost, tzsAmount: 0, status: "success",
        itemName: "SMM order refund", reference: String(order._id)
      }).catch(() => {});
      return { ok: false, status: 502, error: "Order failed upstream. Your SQ was refunded automatically." };
    }
    order.remoteOrderId = String(remote.order);
    order.status = "processing";
    order.updatedAt = new Date();
    await order.save();
  }

  const fresh = await User.findById(opts.userId).lean();
  return {
    ok: true,
    cost,
    balance: (fresh as unknown as { txCoins?: number })?.txCoins ?? debited.txCoins,
    order: {
      id: String(order._id),
      order_id: order.remoteOrderId || String(order._id),
      status: order.status,
      service_id: s.serviceId,
      provider: s.provider,
      service_name: s.name,
      link: opts.link,
      quantity: opts.quantity,
      cost_sq: cost
    }
  };
}

/** Refresh a single order against the provider (no-op when unconfigured). */
export async function refreshOrderStatus(orderDoc: { remoteOrderId?: string; status: string; startCount?: number; remains?: number; updatedAt?: Date; save: () => Promise<unknown> }) {
  if (!providerConfigured() || !orderDoc.remoteOrderId) return;
  const remote = await fetchRemoteStatus(orderDoc.remoteOrderId);
  if (!remote || remote.error) return;
  orderDoc.status = normalizeStatus(remote.status);
  orderDoc.startCount = Number(remote.start_count) || orderDoc.startCount || 0;
  orderDoc.remains = Number(remote.remains) || 0;
  orderDoc.updatedAt = new Date();
  await orderDoc.save();
}

// ===================== PUBLIC CATALOGUE =====================

/** Browse the catalogue (also used by the boosting page before sign-in). */
router.get("/services", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  const filter: Record<string, unknown> = { active: true };
  if (category) filter.category = new RegExp(`^${category}$`, "i");
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { category: new RegExp(q, "i") }, { platform: new RegExp(q, "i") }];
  const services = await SmmService.find(filter).sort({ order: 1, category: 1, name: 1 }).limit(2000).lean();
  res.json({
    services: services.map((s) => {
      const v = s as unknown as Record<string, unknown>;
      return {
        _id: String(v._id),
        serviceId: v.serviceId,
        provider: v.provider,
        name: v.name,
        category: v.category,
        platform: v.platform,
        pricePer1000Sq: v.pricePer1000Sq,
        min: v.min,
        max: v.max,
        description: v.description
      };
    })
  });
});

/** Distinct categories, for the filter chips. */
router.get("/categories", async (_req, res) => {
  const cats = await SmmService.distinct("category", { active: true });
  res.json({ categories: (cats as string[]).sort() });
});

// ===================== USER ORDERS =====================

router.post("/orders", authGuard, banCheck, async (req: AuthRequest, res) => {
  const parsed = z.object({
    serviceId: z.number().int(),
    provider: z.string().optional(),
    link: z.string().url().max(500),
    quantity: z.number().int().min(1)
  }).safeParse(req.body || {});
  if (!parsed.success) { res.status(400).json({ error: "Provide a valid service, link and quantity" }); return; }

  try {
    const result = await createSmmOrder({ userId: String(req.user!._id), source: "web", ...parsed.data });
    if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
    res.json({ ok: true, order: result.order, charged: result.cost, balance: result.balance });
  } catch (err) {
    logger.error({ err }, "SMM order failed");
    res.status(500).json({ error: "Could not place the order, please try again" });
  }
});

router.get("/orders", authGuard, async (req: AuthRequest, res) => {
  const orders = await SmmOrder.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ orders: orders.map(mapOrder) });
});

router.get("/orders/:id", authGuard, async (req: AuthRequest, res) => {
  const order = await SmmOrder.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  await refreshOrderStatus(order as never).catch(() => {});
  res.json({ order: mapOrder(order.toObject()) });
});

export function mapOrder(o: Record<string, unknown>) {
  return {
    _id: String(o._id),
    serviceId: o.serviceId,
    provider: o.provider,
    serviceName: o.serviceName,
    link: o.link,
    quantity: o.quantity,
    priceSq: o.priceSq,
    status: o.status,
    remoteOrderId: o.remoteOrderId,
    startCount: o.startCount,
    remains: o.remains,
    note: o.note,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
}

// ===================== ADMIN =====================

const adminOnly = [authGuard, adminGuard] as const;

router.get("/admin/services", ...adminOnly, async (_req, res) => {
  const services = await SmmService.find({}).sort({ order: 1, category: 1, name: 1 }).lean();
  res.json({ services, providerConfigured: providerConfigured() });
});

const serviceSchema = z.object({
  serviceId: z.number().int(),
  provider: z.string().min(1).max(20).default("px1"),
  name: z.string().min(1).max(200),
  category: z.string().max(80).default("General"),
  platform: z.string().max(40).optional(),
  pricePer1000Sq: z.number().min(0),
  min: z.number().int().min(1).default(100),
  max: z.number().int().min(1).default(100000),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional()
});

router.post("/admin/services", ...adminOnly, async (req: AuthRequest, res) => {
  const parsed = serviceSchema.safeParse(req.body || {});
  if (!parsed.success) { res.status(400).json({ error: "Invalid service payload" }); return; }
  const created = await SmmService.findOneAndUpdate(
    { provider: parsed.data.provider, serviceId: parsed.data.serviceId },
    parsed.data,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await writeAudit({ actorId: req.user!._id, action: "smm_service_upsert", targetId: created._id, meta: parsed.data.name }).catch(() => {});
  res.json({ ok: true, service: created });
});

router.patch("/admin/services/:id", ...adminOnly, async (req: AuthRequest, res) => {
  const parsed = serviceSchema.partial().safeParse(req.body || {});
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const updated = await SmmService.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!updated) { res.status(404).json({ error: "Service not found" }); return; }
  await writeAudit({ actorId: req.user!._id, action: "smm_service_update", targetId: req.params.id, meta: JSON.stringify(parsed.data).slice(0, 300) }).catch(() => {});
  res.json({ ok: true, service: updated });
});

router.delete("/admin/services/:id", ...adminOnly, async (req: AuthRequest, res) => {
  await SmmService.findByIdAndDelete(req.params.id);
  await writeAudit({ actorId: req.user!._id, action: "smm_service_delete", targetId: req.params.id }).catch(() => {});
  res.json({ ok: true });
});

/**
 * Import the upstream catalogue and price it in SQ with a markup multiplier.
 * `markup` is applied to the provider rate, then converted to SQ.
 */
router.post("/admin/sync", ...adminOnly, async (req: AuthRequest, res) => {
  if (!providerConfigured()) { res.status(400).json({ error: "SMM_API_URL / SMM_API_KEY are not configured yet" }); return; }
  const markup = Number(req.body?.markup) || 1.3;
  const remote = await fetchRemoteServices();
  if (!remote.length) { res.status(502).json({ error: "Provider returned no services" }); return; }
  let count = 0;
  for (const s of remote) {
    const rate = Number(s.rate) || 0;
    if (!rate) continue;
    await SmmService.findOneAndUpdate(
      { provider: "px1", serviceId: Number(s.service) },
      {
        provider: "px1",
        serviceId: Number(s.service),
        name: s.name,
        category: s.category || "General",
        pricePer1000Sq: Math.max(1, Math.ceil(rate * markup)),
        min: Number(s.min) || 100,
        max: Number(s.max) || 100000,
        active: true
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    count++;
  }
  await writeAudit({ actorId: req.user!._id, action: "smm_sync", meta: `${count} services, markup ${markup}` }).catch(() => {});
  res.json({ ok: true, imported: count });
});

router.get("/admin/orders", ...adminOnly, async (req, res) => {
  const status = String(req.query.status || "").trim();
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const orders = await SmmOrder.find(filter).sort({ createdAt: -1 }).limit(300).populate("userId", "username email").lean();
  res.json({ orders });
});

/** Manual fulfilment / correction. Setting `refunded` returns the SQ once. */
router.patch("/admin/orders/:id", ...adminOnly, async (req: AuthRequest, res) => {
  const parsed = z.object({
    status: z.enum(["pending", "processing", "completed", "partial", "failed", "refunded", "canceled"]),
    note: z.string().max(300).optional()
  }).safeParse(req.body || {});
  if (!parsed.success) { res.status(400).json({ error: "Invalid status" }); return; }

  const order = await SmmOrder.findById(req.params.id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const refundNow = (parsed.data.status === "refunded" || parsed.data.status === "failed") && !order.refunded;
  if (refundNow) {
    await User.updateOne({ _id: order.userId }, { $inc: { txCoins: order.priceSq } });
    await Transaction.create({
      userId: order.userId, type: "refund", txAmount: order.priceSq, tzsAmount: 0,
      status: "success", itemName: "SMM order refund", reference: String(order._id)
    }).catch(() => {});
    order.refunded = true;
  }
  order.status = parsed.data.status;
  if (parsed.data.note !== undefined) order.note = parsed.data.note;
  order.updatedAt = new Date();
  await order.save();

  await writeAudit({ actorId: req.user!._id, action: "smm_order_update", targetId: order._id, meta: `${parsed.data.status}${refundNow ? " (refunded)" : ""}` }).catch(() => {});
  res.json({ ok: true, order: mapOrder(order.toObject()) });
});

export default router;
