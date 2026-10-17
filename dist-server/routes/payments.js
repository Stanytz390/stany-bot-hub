import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { Package } from "../models/Package.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { paymentRateLimit } from "../middleware/rateLimit.js";
import { roleOf } from "../middleware/roleGuard.js";
import { WebhookLog, logWebhook } from "../models/WebhookLog.js";
import { notifyOwner } from "../services/notify.js";
import { PromoCode, resolvePromo, applyDiscount } from "../models/PromoCode.js";
const router = Router();
const MAX_DAILY_FAILURES = 7;
const MINIMUM_SQ = 10;
const SQ_RATE_TZS = Number(process.env.SQ_RATE || 100);
const MINIMUM_TZS = MINIMUM_SQ * SQ_RATE_TZS;
// ============================================================
// SONIC PESA API CALLS
// ============================================================
const SONIC_API_URL = process.env.SONIC_PESA_API_URL || "https://api.sonicpesa.com/api/v1";
const SONIC_API_KEY = process.env.SONIC_PESA_API_KEY;
const SONIC_API_SECRET = process.env.SONIC_PESA_API_SECRET;
// ============================================================
// 1. CREATE ORDER - Push USSD
// ============================================================
async function createSonicOrder(params) {
    try {
        const response = await fetch(`${SONIC_API_URL}/payment/create_order`, {
            method: "POST",
            headers: {
                "X-API-KEY": SONIC_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                amount: params.amount,
                buyer_phone: params.buyer_phone,
                buyer_name: params.buyer_name || "STANY User",
                buyer_email: params.buyer_email || "user@stany.com",
                currency: "TZS",
            }),
        });
        const data = await response.json();
        if (data.status === "success" && data.data?.order_id) {
            return {
                status: "success",
                order_id: data.data.order_id,
                reference: data.data.reference,
                message: data.message || "USSD push sent to customer",
                payment_status: data.data.payment_status,
            };
        }
        return {
            status: "error",
            message: data.message || "Payment initiation failed",
        };
    }
    catch (error) {
        console.error("SonicPesa create order error:", error);
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
// ============================================================
// 2. CREATE ORDER SIMPLE - Long Polling (45 seconds)
// ============================================================
async function createSonicOrderSimple(params) {
    try {
        const response = await fetch(`${SONIC_API_URL}/payment/create_order_simple`, {
            method: "POST",
            headers: {
                "X-API-KEY": SONIC_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                amount: params.amount,
                buyer_phone: params.buyer_phone,
                buyer_name: params.buyer_name || "STANY User",
                buyer_email: params.buyer_email || "user@stany.com",
                currency: "TZS",
            }),
        });
        const data = await response.json();
        if (data.status === "success" && data.data?.order_id) {
            return {
                status: "success",
                order_id: data.data.order_id,
                reference: data.data.reference,
                message: data.message || "Payment processed",
                payment_status: data.data.payment_status,
                transaction: data.transaction,
            };
        }
        return {
            status: "error",
            message: data.message || "Payment initiation failed",
        };
    }
    catch (error) {
        console.error("SonicPesa create order simple error:", error);
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
// ============================================================
// 3. CHECK ORDER STATUS
// ============================================================
async function checkSonicStatus(orderId) {
    try {
        const response = await fetch(`${SONIC_API_URL}/payment/order_status`, {
            method: "POST",
            headers: {
                "X-API-KEY": SONIC_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ order_id: orderId }),
        });
        const data = await response.json();
        if (data.status === "success" && data.data) {
            return {
                status: "success",
                data: {
                    order_id: data.data.order_id,
                    payment_status: data.data.payment_status,
                    amount: data.data.amount,
                    currency: data.data.currency,
                    phone: data.data.phone || data.data.msisdn,
                    transid: data.data.transid,
                    reference: data.data.reference,
                    channel: data.data.channel,
                    created_at: data.data.created_at,
                },
                transaction: data.transaction,
            };
        }
        return {
            status: "error",
            message: data.message || "Status check failed",
        };
    }
    catch (error) {
        console.error("SonicPesa status check error:", error);
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
// ============================================================
// 4. LIST TRANSACTIONS
// ============================================================
async function listSonicTransactions(params) {
    try {
        const response = await fetch(`${SONIC_API_URL}/transactions/readbyId`, {
            method: "POST",
            headers: {
                "X-API-KEY": SONIC_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify(params || {}),
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error("List transactions error:", error);
        return { status: "error", message: "Failed to fetch transactions" };
    }
}
// ============================================================
// 5. CHECK BALANCE
// ============================================================
async function checkSonicBalance() {
    try {
        const response = await fetch(`${SONIC_API_URL}/balance_check`, {
            method: "POST",
            headers: {
                "X-API-KEY": SONIC_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error("Balance check error:", error);
        return { status: "error", message: "Balance check failed" };
    }
}
// ============================================================
// 6. VERIFY WEBHOOK SIGNATURE
// ============================================================
function verifySonicWebhook(payload, signature) {
    try {
        if (!SONIC_API_SECRET) {
            console.warn("⚠️ SONIC_API_SECRET not configured");
            return false;
        }
        if (!signature)
            return false;
        const clean = signature.replace(/^sha256=/i, "").trim().toLowerCase();
        const calculated = crypto
            .createHmac("sha256", SONIC_API_SECRET)
            .update(payload, "utf8")
            .digest("hex");
        return crypto.timingSafeEqual(Buffer.from(calculated, "utf8"), Buffer.from(clean, "utf8"));
    }
    catch (error) {
        console.error("Webhook verification error:", error);
        return false;
    }
}
// ============================================================
// 7. APPLY GATEWAY RESULT
// ============================================================
async function applyGatewayResult(params) {
    const { orderId, paymentStatus, channel, phone, transid, source } = params;
    const tx = await Transaction.findOne({ sonicRef: orderId });
    if (!tx)
        return "unknown";
    if (tx.status === "success")
        return "success";
    if (tx.status === "failed")
        return "failed";
    const status = String(paymentStatus).toUpperCase();
    if (status === "SUCCESS" || status === "COMPLETED") {
        const updated = await Transaction.findOneAndUpdate({ _id: tx._id, status: "pending" }, {
            $set: {
                status: "success",
                channelProvider: channel || "Unknown",
                reference: transid || tx.reference,
            }
        }, { new: true });
        if (!updated)
            return "success";
        const user = await User.findById(tx.userId);
        if (user) {
            user.txCoins += tx.txAmount;
            await user.save();
            console.log(`✅ [${source}] Credited ${tx.txAmount} SQ to ${user.email}`);
            await notifyOwner(`💰 *Payment Verified (${source})*\n\n` +
                `👤 User: \`${user.email}\`\n` +
                `📊 Amount: ${tx.txAmount} SQ (TZS ${tx.tzsAmount})\n` +
                `📱 Channel: ${channel || "Unknown"}\n` +
                `📞 Phone: ${phone || "N/A"}\n` +
                `🔖 Order ID: \`${orderId}\`\n` +
                `🆔 TransID: ${transid || "N/A"}`).catch(() => { });
        }
        return "success";
    }
    if (status === "FAILED" || status === "CANCELLED" || status === "USERCANCELLED" || status === "REJECTED") {
        const updated = await Transaction.findOneAndUpdate({ _id: tx._id, status: "pending" }, { $set: { status: "failed" } }, { new: true });
        if (updated && tx.userId)
            await recordPaymentFailure(tx.userId.toString());
        return "failed";
    }
    return "pending";
}
// ============================================================
// HELPERS
// ============================================================
function getParam(val) {
    return Array.isArray(val) ? (val[0] ?? "") : val;
}
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
async function recordPaymentFailure(userId) {
    const user = await User.findById(userId);
    if (!user || user.isBanned)
        return;
    const today = todayStr();
    const currentDate = user.paymentFailDate || "";
    const currentCount = user.paymentFailCount || 0;
    const newCount = currentDate === today ? currentCount + 1 : 1;
    if (newCount >= MAX_DAILY_FAILURES) {
        await User.findByIdAndUpdate(userId, {
            isBanned: true,
            banReason: "Automated: excessive payment failures",
            paymentFailCount: newCount,
            paymentFailDate: today,
        });
    }
    else {
        await User.findByIdAndUpdate(userId, {
            paymentFailCount: newCount,
            paymentFailDate: today,
        });
    }
}
// ============================================================
// ============================================================
// ROUTES / ENDPOINTS
// ============================================================
// ============================================================
// ============================================================
// GET PACKAGES
// ============================================================
router.get("/packages", async (_req, res) => {
    try {
        const packages = await Package.find({ active: true }).sort({ order: 1 }).lean();
        res.json(packages);
    }
    catch (error) {
        console.error("Error fetching packages:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// VALIDATE PROMO CODE
// ============================================================
router.post("/promo/validate", authGuard, banCheck, async (req, res) => {
    try {
        const { code, scope, amount } = req.body || {};
        const useScope = scope === "purchase" ? "purchase" : "topup";
        const base0 = Number(amount) || 0;
        const resolved = await resolvePromo(String(code || ""), req.user._id, useScope, base0);
        if ("error" in resolved) {
            res.status(400).json({ error: resolved.error });
            return;
        }
        const base = Number(amount) || 0;
        const { discount, final } = applyDiscount(base, resolved.promo.discountPercent);
        res.json({
            ok: true,
            code: resolved.promo.code,
            discountPercent: resolved.promo.discountPercent,
            discount,
            final
        });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// CHARGE - Create Order (USSD Push)
// POST /api/payments/charge
// ============================================================
router.post("/charge", authGuard, banCheck, paymentRateLimit, async (req, res) => {
    try {
        const schema = z.object({
            packageId: z.string().optional(),
            txAmount: z.number().optional(),
            tzsAmount: z.number().optional(),
            phone: z.string().min(9),
            provider: z.enum(["mpesa", "airtel", "tigo", "halotel", "crdb", "nmb"]),
            promoCode: z.string().optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input" });
            return;
        }
        const { phone, provider, packageId, txAmount, tzsAmount: inputTzsAmount, promoCode } = parsed.data;
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        let totalSQ;
        let tzsAmount;
        if (packageId) {
            const pkg = await Package.findById(packageId);
            if (!pkg) {
                res.status(404).json({ error: "Package not found" });
                return;
            }
            totalSQ = (pkg.txAmount || 0) + (pkg.bonusTx || 0);
            tzsAmount = pkg.tzsPrice;
        }
        else if (inputTzsAmount && inputTzsAmount > 0) {
            tzsAmount = Math.round(inputTzsAmount);
            totalSQ = Math.round(tzsAmount / SQ_RATE_TZS);
            if (totalSQ < MINIMUM_SQ) {
                totalSQ = MINIMUM_SQ;
                tzsAmount = Math.round(MINIMUM_SQ * SQ_RATE_TZS);
            }
        }
        else if (txAmount && txAmount > 0) {
            totalSQ = txAmount;
            tzsAmount = Math.round(txAmount * SQ_RATE_TZS);
        }
        else {
            res.status(400).json({ error: "Missing packageId, txAmount, or tzsAmount" });
            return;
        }
        let appliedPromo = null;
        if (promoCode) {
            const resolved = await resolvePromo(promoCode, user._id, "topup", tzsAmount);
            if ("error" in resolved) {
                res.status(400).json({ error: resolved.error });
                return;
            }
            const { discount, final } = applyDiscount(tzsAmount, resolved.promo.discountPercent);
            appliedPromo = { code: resolved.promo.code, discountPercent: resolved.promo.discountPercent, discount };
            tzsAmount = final;
        }
        // 100% promo (or a discount that clears the whole amount): nothing to charge,
        // credit the SQ immediately without touching the gateway.
        if (appliedPromo && tzsAmount <= 0) {
            const freeRef = `PROMO_${Date.now()}_${user._id.toString().slice(-6)}`;
            user.txCoins += totalSQ;
            await user.save();
            await Transaction.create({
                userId: user._id,
                type: "topup",
                txAmount: totalSQ,
                tzsAmount: 0,
                reference: freeRef,
                status: "success",
                method: "promo",
                itemName: "SQ Top-up (100% promo)",
                promoCode: appliedPromo.code,
                discountAmount: appliedPromo.discount,
            });
            await PromoCode.updateOne({ code: appliedPromo.code }, { $inc: { usedCount: 1 }, $push: { usedBy: user._id } });
            res.json({
                reference: freeRef,
                promo: appliedPromo,
                amountPaid: 0,
                status: "success",
                message: `Promo ${appliedPromo.code} applied — ${totalSQ} SQ added free!`,
            });
            return;
        }
        if (totalSQ < MINIMUM_SQ) {
            res.status(400).json({
                error: `Minimum deposit is ${MINIMUM_SQ} SQ (${MINIMUM_TZS.toFixed(0)} TZS)`,
            });
            return;
        }
        const normalizedPhone = phone.replace(/\D/g, "");
        if (!normalizedPhone.startsWith("255") || normalizedPhone.length !== 12) {
            res.status(400).json({ error: "Invalid phone number. Must be 255XXXXXXXXX" });
            return;
        }
        const result = await createSonicOrder({
            amount: tzsAmount,
            buyer_phone: normalizedPhone,
            buyer_name: user.username || user.email,
            buyer_email: user.email,
        });
        if (result.status !== "success" || !result.order_id) {
            await recordPaymentFailure(req.user._id.toString());
            res.status(500).json({ error: result.message || "Payment initiation failed" });
            return;
        }
        await Transaction.create({
            userId: user._id,
            type: "topup",
            txAmount: totalSQ,
            tzsAmount: tzsAmount,
            sonicRef: result.order_id,
            reference: result.reference || `STANY_${Date.now()}_${user._id.toString().slice(-6)}`,
            status: "pending",
            method: "sonicpesa",
            itemName: "SQ Top-up",
            channelProvider: provider || "Unknown",
            phone: normalizedPhone,
            promoCode: appliedPromo?.code || "",
            discountAmount: appliedPromo?.discount || 0,
        });
        if (appliedPromo) {
            await PromoCode.updateOne({ code: appliedPromo.code }, { $inc: { usedCount: 1 }, $push: { usedBy: user._id } });
        }
        res.json({
            reference: result.order_id,
            promo: appliedPromo,
            amountPaid: tzsAmount,
            message: result.message || "USSD push sent to your phone. Please check and confirm.",
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Charge failed";
        console.error("Charge error:", err);
        res.status(400).json({ error: message });
    }
});
// ============================================================
// CHARGE SIMPLE - Long Polling (45 seconds)
// POST /api/payments/charge-simple
// ============================================================
router.post("/charge-simple", authGuard, banCheck, paymentRateLimit, async (req, res) => {
    try {
        const schema = z.object({
            packageId: z.string().optional(),
            txAmount: z.number().optional(),
            tzsAmount: z.number().optional(),
            phone: z.string().min(9),
            provider: z.enum(["mpesa", "airtel", "tigo", "halotel", "crdb", "nmb"]),
            promoCode: z.string().optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input" });
            return;
        }
        const { phone, provider, packageId, txAmount, tzsAmount: inputTzsAmount, promoCode } = parsed.data;
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        let totalSQ;
        let tzsAmount;
        if (packageId) {
            const pkg = await Package.findById(packageId);
            if (!pkg) {
                res.status(404).json({ error: "Package not found" });
                return;
            }
            totalSQ = (pkg.txAmount || 0) + (pkg.bonusTx || 0);
            tzsAmount = pkg.tzsPrice;
        }
        else if (inputTzsAmount && inputTzsAmount > 0) {
            tzsAmount = Math.round(inputTzsAmount);
            totalSQ = Math.round(tzsAmount / SQ_RATE_TZS);
            if (totalSQ < MINIMUM_SQ) {
                totalSQ = MINIMUM_SQ;
                tzsAmount = Math.round(MINIMUM_SQ * SQ_RATE_TZS);
            }
        }
        else if (txAmount && txAmount > 0) {
            totalSQ = txAmount;
            tzsAmount = Math.round(txAmount * SQ_RATE_TZS);
        }
        else {
            res.status(400).json({ error: "Missing packageId, txAmount, or tzsAmount" });
            return;
        }
        let appliedPromo = null;
        if (promoCode) {
            const resolved = await resolvePromo(promoCode, user._id, "topup", tzsAmount);
            if ("error" in resolved) {
                res.status(400).json({ error: resolved.error });
                return;
            }
            const { discount, final } = applyDiscount(tzsAmount, resolved.promo.discountPercent);
            appliedPromo = { code: resolved.promo.code, discountPercent: resolved.promo.discountPercent, discount };
            tzsAmount = final;
        }
        if (appliedPromo && tzsAmount <= 0) {
            const freeRef = `PROMO_${Date.now()}_${user._id.toString().slice(-6)}`;
            user.txCoins += totalSQ;
            await user.save();
            await Transaction.create({
                userId: user._id,
                type: "topup",
                txAmount: totalSQ,
                tzsAmount: 0,
                reference: freeRef,
                status: "success",
                method: "promo",
                itemName: "SQ Top-up (100% promo)",
                promoCode: appliedPromo.code,
                discountAmount: appliedPromo.discount,
            });
            await PromoCode.updateOne({ code: appliedPromo.code }, { $inc: { usedCount: 1 }, $push: { usedBy: user._id } });
            res.json({
                reference: freeRef,
                promo: appliedPromo,
                amountPaid: 0,
                status: "success",
                message: `Promo ${appliedPromo.code} applied — ${totalSQ} SQ added free!`,
            });
            return;
        }
        if (totalSQ < MINIMUM_SQ) {
            res.status(400).json({
                error: `Minimum deposit is ${MINIMUM_SQ} SQ (${MINIMUM_TZS.toFixed(0)} TZS)`,
            });
            return;
        }
        const normalizedPhone = phone.replace(/\D/g, "");
        if (!normalizedPhone.startsWith("255") || normalizedPhone.length !== 12) {
            res.status(400).json({ error: "Invalid phone number. Must be 255XXXXXXXXX" });
            return;
        }
        const result = await createSonicOrderSimple({
            amount: tzsAmount,
            buyer_phone: normalizedPhone,
            buyer_name: user.username || user.email,
            buyer_email: user.email,
        });
        if (result.status !== "success" || !result.order_id) {
            await recordPaymentFailure(req.user._id.toString());
            res.status(500).json({ error: result.message || "Payment initiation failed" });
            return;
        }
        // Check if payment was already successful (long polling returned result)
        const paymentStatus = result.payment_status || "";
        const isSuccess = paymentStatus.toUpperCase() === "SUCCESS" || paymentStatus.toUpperCase() === "COMPLETED";
        const txData = {
            userId: user._id,
            type: "topup",
            txAmount: totalSQ,
            tzsAmount: tzsAmount,
            sonicRef: result.order_id,
            reference: result.reference || `STANY_${Date.now()}_${user._id.toString().slice(-6)}`,
            status: isSuccess ? "success" : "pending",
            method: "sonicpesa",
            itemName: "SQ Top-up",
            channelProvider: provider || "Unknown",
            phone: normalizedPhone,
            promoCode: appliedPromo?.code || "",
            discountAmount: appliedPromo?.discount || 0,
        };
        const tx = await Transaction.create(txData);
        // If already successful, credit the user
        if (isSuccess) {
            user.txCoins += totalSQ;
            await user.save();
            await notifyOwner(`💰 *Payment Verified (Simple)*\n\n` +
                `👤 User: \`${user.email}\`\n` +
                `📊 Amount: ${totalSQ} SQ (TZS ${tzsAmount})\n` +
                `📱 Channel: ${provider || "Unknown"}\n` +
                `📞 Phone: ${normalizedPhone}\n` +
                `🔖 Order ID: \`${result.order_id}\``).catch(() => { });
        }
        if (appliedPromo) {
            await PromoCode.updateOne({ code: appliedPromo.code }, { $inc: { usedCount: 1 }, $push: { usedBy: user._id } });
        }
        res.json({
            reference: result.order_id,
            promo: appliedPromo,
            amountPaid: tzsAmount,
            status: isSuccess ? "success" : "pending",
            message: isSuccess
                ? `Payment confirmed! ${totalSQ} SQ added to your balance.`
                : result.message || "Payment initiated. Waiting for confirmation...",
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Charge failed";
        console.error("Charge simple error:", err);
        res.status(400).json({ error: message });
    }
});
// ============================================================
// CHECK STATUS - Polling
// GET /api/payments/charge/status/:reference
// ============================================================
router.get("/charge/status/:reference", authGuard, banCheck, async (req, res) => {
    try {
        const reference = getParam(req.params.reference);
        const result = await checkSonicStatus(reference);
        if (result.status !== "success" || !result.data) {
            res.json({
                status: "pending",
                orderId: reference,
                gatewayStatus: "",
                message: "Waiting for SonicPesa to confirm the payment.",
            });
            return;
        }
        const { payment_status, channel, phone, transid } = result.data;
        const tx = await Transaction.findOne({
            sonicRef: reference,
            userId: req.user._id,
        });
        if (!tx) {
            res.json({
                status: "pending",
                orderId: reference,
                gatewayStatus: String(payment_status || ""),
                message: "Order not found.",
            });
            return;
        }
        const wasSettled = tx.status === "success";
        const outcome = await applyGatewayResult({
            orderId: reference,
            paymentStatus: payment_status,
            channel,
            phone,
            transid,
            source: "poll"
        });
        if (outcome === "success") {
            res.json({
                orderId: reference,
                status: "success",
                txAmount: tx.txAmount,
                tzsAmount: tx.tzsAmount,
                message: wasSettled
                    ? `Order ${reference} was already confirmed.`
                    : `Payment confirmed! ${tx.txAmount} SQ added.`,
            });
            return;
        }
        if (outcome === "failed") {
            res.json({
                orderId: reference,
                status: "failed",
                message: `Payment ${payment_status}. No SQ was charged.`,
            });
            return;
        }
        res.json({
            orderId: reference,
            status: "pending",
            gatewayStatus: String(payment_status || ""),
            message: `Waiting for confirmation...`,
        });
    }
    catch (error) {
        console.error("Status check error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// WEBHOOK - SonicPesa Callback
// POST /api/payments/webhook
// ============================================================
router.post("/webhook", async (req, res) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "";
    const payload = req.rawBody ?? JSON.stringify(req.body ?? {});
    try {
        const signature = req.headers["x-sonicpesa-signature"] ||
            req.headers["x-signature"] ||
            "";
        const signatureValid = verifySonicWebhook(payload, signature);
        if (!signatureValid) {
            console.error("❌ Invalid webhook signature");
            res.status(403).json({ error: "Invalid signature" });
            return;
        }
        const body = (req.body ?? {});
        const src = body.data ?? body;
        const order_id = String(src.order_id ?? body.order_id ?? "");
        const payment_status = String(src.payment_status ?? body.status ?? src.status ?? "");
        const channel = src.channel ?? body.channel;
        const phone = src.msisdn ?? body.msisdn ?? src.phone;
        const transid = src.transid ?? body.transid;
        console.log("📩 SonicPesa Webhook received:", JSON.stringify(body));
        if (!order_id || !payment_status) {
            console.error("❌ Missing order_id or payment_status");
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        const before = await Transaction.findOne({ sonicRef: order_id }).lean();
        const alreadySettled = before?.status === "success";
        const result = await applyGatewayResult({
            orderId: order_id,
            paymentStatus: payment_status,
            channel,
            phone,
            transid,
            source: "webhook"
        });
        // Log webhook attempt
        await logWebhook({
            source: "webhook",
            orderId: order_id,
            paymentStatus: payment_status,
            outcome: result,
            ok: result !== "unknown",
            httpStatus: 200,
            signatureValid: true,
            attempt: 1,
            credited: result === "success" && !alreadySettled,
            amountSq: before?.txAmount || 0,
            amountTzs: before?.tzsAmount || 0,
            userEmail: "",
            network: channel || "",
            phone: phone || "",
            payload: payload.slice(0, 2000),
            ip
        });
        res.status(200).json({ ok: true, order_id, result });
    }
    catch (err) {
        console.error("🔥 Webhook error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// MANUAL CONFIRM - Emergency
// POST /api/payments/manual-confirm/:reference
// ============================================================
router.post("/manual-confirm/:reference", authGuard, banCheck, async (req, res) => {
    try {
        const reference = getParam(req.params.reference);
        const tx = await Transaction.findOne({
            sonicRef: reference,
            userId: req.user._id,
        });
        if (!tx) {
            res.status(404).json({ error: "Transaction not found" });
            return;
        }
        if (tx.status === "success") {
            res.json({ message: "Already confirmed" });
            return;
        }
        if (tx.status === "failed") {
            res.json({ message: "Transaction failed" });
            return;
        }
        tx.status = "success";
        await tx.save();
        const user = await User.findById(tx.userId);
        if (user) {
            user.txCoins += tx.txAmount;
            await user.save();
        }
        res.json({ message: "Transaction confirmed manually", txAmount: tx.txAmount });
    }
    catch (error) {
        console.error("Manual confirm error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// HISTORY - User Transactions
// GET /api/payments/history
// ============================================================
router.get("/history", authGuard, banCheck, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        res.json(transactions);
    }
    catch (error) {
        console.error("History error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// RECEIPT - Get Single Receipt
// GET /api/payments/receipt/:ref
// ============================================================
router.get("/receipt/:ref", authGuard, async (req, res) => {
    try {
        const ref = getParam(req.params.ref);
        const tx = await Transaction.findOne({
            userId: req.user._id,
            $or: [{ reference: ref }, { sonicRef: ref }]
        }).lean();
        if (!tx) {
            res.status(404).json({ error: "Receipt not found" });
            return;
        }
        if (tx.status !== "success") {
            res.status(409).json({ error: "Payment not confirmed yet", status: tx.status });
            return;
        }
        const user = await User.findById(req.user._id).lean();
        res.json({
            receiptNo: `SH-${String(tx._id).slice(-8).toUpperCase()}`,
            reference: tx.reference || tx.sonicRef,
            date: tx.createdAt,
            status: tx.status,
            sqAmount: tx.txAmount,
            tzsAmount: tx.tzsAmount || 0,
            method: tx.method || "sonicpesa",
            channelProvider: tx.channelProvider || "",
            phone: tx.phone || "",
            promoCode: tx.promoCode || "",
            discountAmount: tx.discountAmount || 0,
            customer: {
                username: user?.username || "",
                email: user?.email || "",
            },
        });
    }
    catch (error) {
        console.error("Receipt error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// LIST RECEIPTS - All Receipts for User
// GET /api/payments/receipts
// ============================================================
router.get("/receipts", authGuard, async (req, res) => {
    try {
        const rows = await Transaction.find({ userId: req.user._id, status: "success" })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json(rows.map((t) => ({
            id: String(t._id),
            reference: t.reference || t.sonicRef || String(t._id),
            receiptNo: `SH-${String(t._id).slice(-8).toUpperCase()}`,
            date: t.createdAt,
            type: t.type,
            itemName: t.itemName || (t.type === "topup" ? "SQ Top-up" : t.type),
            sqAmount: t.txAmount,
            tzsAmount: t.tzsAmount || 0,
            method: t.method || "sonicpesa",
            status: t.status,
        })));
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// CHECK BALANCE - SonicPesa Account Balance
// GET /api/payments/balance
// ============================================================
router.get("/balance", authGuard, async (req, res) => {
    try {
        if (roleOf(req.user) !== "admin") {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        const balance = await checkSonicBalance();
        res.json(balance);
    }
    catch (error) {
        console.error("Balance error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// LIST TRANSACTIONS - SonicPesa (Admin)
// GET /api/payments/sonic-transactions
// ============================================================
router.get("/sonic-transactions", authGuard, async (req, res) => {
    try {
        if (roleOf(req.user) !== "admin") {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        const { userId, limit } = req.query;
        const data = await listSonicTransactions({
            userId: userId ? String(userId) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
        res.json(data);
    }
    catch (error) {
        console.error("Sonic transactions error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// WEBHOOK LOGS - Admin
// GET /api/payments/webhook-logs
// ============================================================
router.get("/webhook-logs", authGuard, async (req, res) => {
    try {
        if (roleOf(req.user) !== "admin") {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
        const status = typeof req.query.status === "string" ? req.query.status : "all";
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const filter = {};
        if (status !== "all")
            filter.outcome = status;
        if (q)
            filter.$or = [{ orderId: { $regex: q, $options: "i" } }, { userEmail: { $regex: q, $options: "i" } }];
        const [rows, total, agg] = await Promise.all([
            WebhookLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            WebhookLog.countDocuments(filter),
            WebhookLog.aggregate([{ $group: { _id: "$outcome", count: { $sum: 1 } } }])
        ]);
        const stats = { success: 0, failed: 0, pending: 0, rejected: 0, error: 0, unknown: 0 };
        for (const a of agg)
            stats[a._id] = a.count;
        const credited = await WebhookLog.countDocuments({ credited: true });
        res.json({
            logs: rows.map((l) => ({
                _id: String(l._id),
                orderId: l.orderId,
                source: l.source,
                outcome: l.outcome,
                paymentStatus: l.paymentStatus,
                signatureValid: l.signatureValid,
                attempt: l.attempt,
                credited: l.credited,
                amountSq: l.amountSq,
                amountTzs: l.amountTzs,
                userEmail: l.userEmail,
                network: l.network,
                error: l.error,
                httpStatus: l.httpStatus,
                createdAt: l.createdAt
            })),
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            stats: { ...stats, credited }
        });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
// ============================================================
// WEBHOOK LOGS - Specific Order
// GET /api/payments/webhook-logs/:orderId
// ============================================================
router.get("/webhook-logs/:orderId", authGuard, async (req, res) => {
    try {
        if (roleOf(req.user) !== "admin") {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        const rows = await WebhookLog.find({ orderId: String(req.params.orderId) }).sort({ createdAt: 1 }).lean();
        res.json({
            attempts: rows.map((l) => ({
                _id: String(l._id),
                attempt: l.attempt,
                source: l.source,
                outcome: l.outcome,
                credited: l.credited,
                signatureValid: l.signatureValid,
                httpStatus: l.httpStatus,
                error: l.error,
                createdAt: l.createdAt
            }))
        });
    }
    catch {
        res.status(500).json({ error: "Server error" });
    }
});
export default router;
