import { Router } from "express";
import { z } from "zod";
import { SmmService, SmmOrder } from "../models/Smm.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { writeAudit } from "../models/AuditLog.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { adminGuard } from "../middleware/admin.js";
import { fetchRemoteServices, placeRemoteOrder, fetchRemoteStatus, normalizeStatus, providerConfigured, parseRemoteNumber, } from "../services/smm.js";
import { logger } from "../logger.js";
const router = Router();
const XD_TO_SQ_RATE = Number(process.env.SMM_XD_TO_SQ_RATE) || 1;
const DEFAULT_MARKUP = 1.3;
/**
 * Calculate the SQ charged for an order.
 */
export function orderCost(pricePer1000Sq, quantity) {
    return Math.max(1, Math.ceil((pricePer1000Sq * quantity) / 1000));
}
/**
 * Find and validate an active service.
 */
async function findActiveService(serviceId, provider) {
    return SmmService.findOne({
        serviceId,
        active: true,
        ...(provider ? { provider } : {}),
    }).lean();
}
/**
 * Refund an order only when its refunded flag is still false.
 *
 * The conditional update prevents concurrent requests from
 * crediting the same order more than once.
 */
async function refundOrder(orderId, note) {
    const order = await SmmOrder.findOneAndUpdate({
        _id: orderId,
        refunded: { $ne: true },
    }, {
        $set: {
            refunded: true,
            status: "refunded",
            note,
            updatedAt: new Date(),
        },
    }, { new: true });
    if (!order) {
        return false;
    }
    const user = await User.updateOne({ _id: order.userId }, { $inc: { txCoins: order.priceSq } });
    if (user.matchedCount === 0) {
        logger.error({ orderId: String(orderId) }, "SMM refund could not find the user");
        // Do not silently report a successful refund.
        throw new Error("Refund user not found");
    }
    await Transaction.create({
        userId: order.userId,
        type: "refund",
        txAmount: order.priceSq,
        tzsAmount: 0,
        status: "success",
        itemName: "SMM order refund",
        reference: String(order._id),
    });
    return true;
}
/**
 * Shared order pipeline for the web application.
 *
 * SQ is debited before the provider request.
 */
export async function createSmmOrder(opts) {
    const svc = await findActiveService(opts.serviceId, opts.provider);
    if (!svc) {
        return {
            ok: false,
            status: 404,
            error: "Service not found",
        };
    }
    const service = svc;
    if (!Number.isInteger(opts.quantity) ||
        opts.quantity < service.min ||
        opts.quantity > service.max) {
        return {
            ok: false,
            status: 400,
            error: `Quantity must be between ${service.min} and ${service.max}`,
        };
    }
    if (!opts.link || opts.link.length > 500) {
        return {
            ok: false,
            status: 400,
            error: "Invalid order link",
        };
    }
    const cost = orderCost(service.pricePer1000Sq, opts.quantity);
    const debited = await User.findOneAndUpdate({
        _id: opts.userId,
        txCoins: { $gte: cost },
    }, {
        $inc: { txCoins: -cost },
    }, { new: true });
    if (!debited) {
        return {
            ok: false,
            status: 402,
            error: "Insufficient SQ balance. Please top up.",
        };
    }
    let order;
    try {
        order = await SmmOrder.create({
            userId: opts.userId,
            serviceRef: service._id,
            serviceId: service.serviceId,
            provider: service.provider,
            serviceName: service.name,
            link: opts.link,
            quantity: opts.quantity,
            priceSq: cost,
            source: opts.source,
            status: "pending",
        });
        await Transaction.create({
            userId: opts.userId,
            type: "smm",
            txAmount: cost,
            tzsAmount: 0,
            status: "success",
            itemName: `${service.name} x${opts.quantity}`,
            reference: String(order._id),
        });
    }
    catch (error) {
        await User.updateOne({ _id: opts.userId }, { $inc: { txCoins: cost } }).catch((refundError) => {
            logger.error({ refundError }, "Failed to restore SQ after order initialization error");
        });
        logger.error({ error }, "Failed to initialize SMM order");
        return {
            ok: false,
            status: 500,
            error: "Could not initialize the order",
        };
    }
    if (!providerConfigured()) {
        // Keep the order pending for manual fulfilment.
        const fresh = await User.findById(opts.userId).lean();
        return {
            ok: true,
            cost,
            balance: fresh?.txCoins ??
                debited.txCoins,
            order: {
                id: String(order._id),
                order_id: String(order._id),
                status: order.status,
                service_id: service.serviceId,
                provider: service.provider,
                service_name: service.name,
                link: opts.link,
                quantity: opts.quantity,
                cost_sq: cost,
            },
        };
    }
    let remote;
    try {
        remote = await placeRemoteOrder(service.serviceId, service.provider, opts.link, opts.quantity);
    }
    catch (error) {
        logger.error({ error, orderId: String(order._id) }, "SMM provider request failed");
        /*
         * Do not automatically refund an ambiguous request here.
         * The provider may have accepted the order before the
         * connection failed. Reconcile the order first.
         */
        order.note =
            "Provider request outcome is uncertain; reconciliation required";
        order.updatedAt = new Date();
        await order.save();
        return {
            ok: false,
            status: 502,
            error: "Provider response is uncertain. The order requires verification before retrying.",
        };
    }
    if (!remote) {
        /*
         * The adapter currently returns null for both explicit
         * provider rejections and transport failures.
         *
         * Because these cases cannot safely be distinguished here,
         * keep the order pending for reconciliation instead of
         * risking a duplicate order or an incorrect refund.
         */
        order.note =
            "Provider response unavailable; verify upstream order before refund";
        order.updatedAt = new Date();
        await order.save();
        return {
            ok: false,
            status: 502,
            error: "Could not confirm the provider response. The order requires verification.",
        };
    }
    order.remoteOrderId = String(remote.orderData.order_id);
    order.status = normalizeStatus(remote.orderData.status);
    order.updatedAt = new Date();
    await order.save();
    const fresh = await User.findById(opts.userId).lean();
    return {
        ok: true,
        cost,
        balance: fresh?.txCoins ??
            debited.txCoins,
        order: {
            id: String(order._id),
            order_id: order.remoteOrderId,
            status: order.status,
            service_id: service.serviceId,
            provider: service.provider,
            service_name: service.name,
            link: opts.link,
            quantity: opts.quantity,
            cost_sq: cost,
            charged_xd: remote.charged_xd,
            provider_balance_after: remote.balance_after,
        },
    };
}
/**
 * Refresh a local order from the upstream provider.
 */
export async function refreshOrderStatus(orderDoc) {
    if (!providerConfigured() ||
        !orderDoc.remoteOrderId) {
        return;
    }
    const remote = await fetchRemoteStatus(orderDoc.remoteOrderId);
    if (!remote) {
        return;
    }
    orderDoc.status = normalizeStatus(remote.status);
    const startCount = parseRemoteNumber(remote.start_count);
    const remains = parseRemoteNumber(remote.remains);
    if (startCount !== undefined) {
        orderDoc.startCount = startCount;
    }
    if (remains !== undefined) {
        orderDoc.remains = remains;
    }
    orderDoc.updatedAt = new Date();
    await orderDoc.save();
}
// ============================================================================
// PUBLIC CATALOGUE
// ============================================================================
router.get("/services", async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const category = String(req.query.category || "").trim();
        const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
        const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit || "100"), 10) || 100));
        const filter = {
            active: true,
        };
        if (category) {
            filter.category = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        }
        if (q) {
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [
                { name: new RegExp(escaped, "i") },
                { category: new RegExp(escaped, "i") },
                { platform: new RegExp(escaped, "i") },
            ];
        }
        const [services, total] = await Promise.all([
            SmmService.find(filter)
                .sort({ order: 1, category: 1, name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            SmmService.countDocuments(filter),
        ]);
        res.json({
            services: services.map((item) => ({
                _id: String(item._id),
                serviceId: item.serviceId,
                provider: item.provider,
                name: item.name,
                category: item.category,
                platform: item.platform,
                pricePer1000Sq: item.pricePer1000Sq,
                min: item.min,
                max: item.max,
                description: item.description,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to fetch SMM services");
        res.status(500).json({
            error: "Could not fetch services",
        });
    }
});
router.get("/categories", async (_req, res) => {
    try {
        const categories = await SmmService.distinct("category", { active: true });
        res.json({
            categories: categories.sort(),
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to fetch SMM categories");
        res.status(500).json({
            error: "Could not fetch categories",
        });
    }
});
// ============================================================================
// USER ORDERS
// ============================================================================
router.post("/orders", authGuard, banCheck, async (req, res) => {
    const parsed = z
        .object({
        serviceId: z.number().int().positive(),
        provider: z.string().min(1).max(20).optional(),
        link: z.string().url().max(500),
        quantity: z.number().int().positive(),
    })
        .safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({
            error: "Provide a valid service, link and quantity",
        });
        return;
    }
    try {
        const result = await createSmmOrder({
            userId: String(req.user._id),
            source: "web",
            ...parsed.data,
        });
        if (!result.ok) {
            res.status(result.status).json({
                error: result.error,
            });
            return;
        }
        res.json({
            ok: true,
            order: result.order,
            charged: result.cost,
            balance: result.balance,
        });
    }
    catch (error) {
        logger.error({ error }, "SMM order creation failed");
        res.status(500).json({
            error: "Could not place the order",
        });
    }
});
router.get("/orders", authGuard, async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
        const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit || "50"), 10) || 50));
        const filter = {
            userId: req.user._id,
        };
        const [orders, total] = await Promise.all([
            SmmOrder.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            SmmOrder.countDocuments(filter),
        ]);
        res.json({
            orders: orders.map((order) => mapOrder(order)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to fetch user orders");
        res.status(500).json({
            error: "Could not fetch orders",
        });
    }
});
router.get("/orders/:id", authGuard, async (req, res) => {
    try {
        const order = await SmmOrder.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!order) {
            res.status(404).json({
                error: "Order not found",
            });
            return;
        }
        await refreshOrderStatus(order).catch((error) => {
            logger.warn({ error, orderId: String(order._id) }, "Could not refresh SMM order status");
        });
        res.json({
            order: mapOrder(order.toObject()),
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to fetch order");
        res.status(500).json({
            error: "Could not fetch order",
        });
    }
});
export function mapOrder(order) {
    return {
        _id: String(order._id),
        serviceId: order.serviceId,
        provider: order.provider,
        serviceName: order.serviceName,
        link: order.link,
        quantity: order.quantity,
        priceSq: order.priceSq,
        status: order.status,
        remoteOrderId: order.remoteOrderId,
        startCount: order.startCount,
        remains: order.remains,
        note: order.note,
        refunded: order.refunded,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
}
// ============================================================================
// ADMIN
// ============================================================================
const adminOnly = [authGuard, adminGuard];
router.get("/admin/services", ...adminOnly, async (_req, res) => {
    try {
        const services = await SmmService.find({})
            .sort({ order: 1, category: 1, name: 1 })
            .lean();
        res.json({
            services,
            providerConfigured: providerConfigured(),
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to fetch admin services");
        res.status(500).json({
            error: "Could not fetch services",
        });
    }
});
const serviceSchema = z.object({
    serviceId: z.number().int().positive(),
    provider: z.string().min(1).max(20).default("px1"),
    name: z.string().min(1).max(200),
    category: z.string().max(80).default("General"),
    platform: z.string().max(40).optional(),
    pricePer1000Sq: z.number().finite().min(0),
    min: z.number().int().positive().default(100),
    max: z.number().int().positive().default(100000),
    description: z.string().max(500).optional(),
    active: z.boolean().optional(),
    order: z.number().int().optional(),
}).refine((value) => value.max >= value.min, {
    message: "Maximum quantity must be at least minimum quantity",
});
router.post("/admin/services", ...adminOnly, async (req, res) => {
    const parsed = serviceSchema.safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({
            error: "Invalid service payload",
        });
        return;
    }
    try {
        const created = await SmmService.findOneAndUpdate({
            provider: parsed.data.provider,
            serviceId: parsed.data.serviceId,
        }, parsed.data, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        });
        await writeAudit({
            actorId: req.user._id,
            action: "smm_service_upsert",
            targetId: created._id,
            meta: parsed.data.name,
        }).catch(() => { });
        res.json({
            ok: true,
            service: created,
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to save SMM service");
        res.status(500).json({
            error: "Could not save service",
        });
    }
});
router.patch("/admin/services/:id", ...adminOnly, async (req, res) => {
    const parsed = serviceSchema.partial().safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({
            error: "Invalid service payload",
        });
        return;
    }
    try {
        const updated = await SmmService.findByIdAndUpdate(req.params.id, parsed.data, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            res.status(404).json({
                error: "Service not found",
            });
            return;
        }
        await writeAudit({
            actorId: req.user._id,
            action: "smm_service_update",
            targetId: req.params.id,
            meta: JSON.stringify(parsed.data).slice(0, 300),
        }).catch(() => { });
        res.json({
            ok: true,
            service: updated,
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to update SMM service");
        res.status(500).json({
            error: "Could not update service",
        });
    }
});
router.delete("/admin/services/:id", ...adminOnly, async (req, res) => {
    try {
        const deleted = await SmmService.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({
                error: "Service not found",
            });
            return;
        }
        await writeAudit({
            actorId: req.user._id,
            action: "smm_service_delete",
            targetId: req.params.id,
        }).catch(() => { });
        res.json({ ok: true });
    }
    catch (error) {
        logger.error({ error }, "Failed to delete SMM service");
        res.status(500).json({
            error: "Could not delete service",
        });
    }
});
// ============================================================================
// ADMIN: SYNCHRONIZE BWM XMD CATALOGUE
// ============================================================================
router.post("/admin/sync", ...adminOnly, async (req, res) => {
    if (!providerConfigured()) {
        res.status(400).json({
            error: "SMM_API_URL / SMM_API_KEY are not configured",
        });
        return;
    }
    const markupInput = Number(req.body?.markup);
    const markup = Number.isFinite(markupInput) && markupInput > 0
        ? markupInput
        : DEFAULT_MARKUP;
    try {
        const remote = await fetchRemoteServices();
        if (!remote.length) {
            res.status(502).json({
                error: "Provider returned no services. Check API credentials, pagination and provider availability.",
            });
            return;
        }
        let imported = 0;
        let skipped = 0;
        for (const service of remote) {
            const priceXd = Number(service.price_per_1000_xd);
            if (!Number.isFinite(service.id) ||
                !service.provider ||
                !Number.isFinite(priceXd) ||
                priceXd <= 0) {
                skipped++;
                continue;
            }
            const priceSq = Math.max(1, Math.ceil(priceXd * XD_TO_SQ_RATE * markup));
            await SmmService.findOneAndUpdate({
                provider: service.provider,
                serviceId: service.id,
            }, {
                $set: {
                    provider: service.provider,
                    serviceId: service.id,
                    name: service.name,
                    category: service.category || "General",
                    pricePer1000Sq: priceSq,
                    min: service.min || 1,
                    max: service.max || 100000,
                    active: true,
                },
            }, {
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true,
            });
            imported++;
        }
        await writeAudit({
            actorId: req.user._id,
            action: "smm_sync",
            meta: `${imported} services imported; ` +
                `${skipped} skipped; markup ${markup}; ` +
                `XD-to-SQ rate ${XD_TO_SQ_RATE}`,
        }).catch(() => { });
        res.json({
            ok: true,
            imported,
            skipped,
            markup,
            xdToSqRate: XD_TO_SQ_RATE,
        });
    }
    catch (error) {
        logger.error({ error }, "BWM XMD catalogue synchronization failed");
        res.status(502).json({
            error: "Could not synchronize the provider catalogue",
        });
    }
});
// ============================================================================
// ADMIN: ORDERS
// ============================================================================
router.get("/admin/orders", ...adminOnly, async (req, res) => {
    try {
        const status = String(req.query.status || "").trim();
        const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
        const limit = Math.min(300, Math.max(1, Number.parseInt(String(req.query.limit || "100"), 10) || 100));
        const filter = {};
        if (status) {
            filter.status = status;
        }
        const [orders, total] = await Promise.all([
            SmmOrder.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("userId", "username email")
                .lean(),
            SmmOrder.countDocuments(filter),
        ]);
        res.json({
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        logger.error({ error }, "Failed to fetch admin orders");
        res.status(500).json({
            error: "Could not fetch orders",
        });
    }
});
// ============================================================================
// ADMIN: MANUAL ORDER STATUS AND REFUNDS
// ============================================================================
router.patch("/admin/orders/:id", ...adminOnly, async (req, res) => {
    const parsed = z
        .object({
        status: z.enum([
            "pending",
            "processing",
            "completed",
            "partial",
            "failed",
            "refunded",
            "canceled",
        ]),
        note: z.string().max(300).optional(),
    })
        .safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({
            error: "Invalid status",
        });
        return;
    }
    try {
        const order = await SmmOrder.findById(req.params.id);
        if (!order) {
            res.status(404).json({
                error: "Order not found",
            });
            return;
        }
        const needsRefund = parsed.data.status === "refunded" ||
            parsed.data.status === "failed";
        let refundProcessed = false;
        if (needsRefund && !order.refunded) {
            refundProcessed = await refundOrder(order._id, parsed.data.note || "Admin-issued SMM refund");
        }
        if (!refundProcessed) {
            order.status = parsed.data.status;
            if (parsed.data.note !== undefined) {
                order.note = parsed.data.note;
            }
            order.updatedAt = new Date();
            await order.save();
        }
        await writeAudit({
            actorId: req.user._id,
            action: "smm_order_update",
            targetId: order._id,
            meta: `${parsed.data.status}` +
                `${refundProcessed ? " (refunded)" : ""}`,
        }).catch(() => { });
        const updated = await SmmOrder.findById(order._id).lean();
        res.json({
            ok: true,
            order: mapOrder((updated || order.toObject())),
            refundProcessed,
        });
    }
    catch (error) {
        logger.error({ error, orderId: req.params.id }, "Failed to update SMM order");
        res.status(500).json({
            error: "Could not update order",
        });
    }
});
export default router;
