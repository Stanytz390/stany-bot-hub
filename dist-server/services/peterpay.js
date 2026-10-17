// server/services/peterpay.ts
import crypto from "crypto";
const PETERPAY_API_URL = process.env.PETERPAY_API_URL || "https://api.peterpay.link/api/v1";
const PETERPAY_API_KEY = process.env.PETERPAY_API_KEY;
const PETERPAY_API_SECRET = process.env.PETERPAY_API_SECRET;
// ============================================================
// 1. INITIATE PAYMENT
// POST /api/v1/create_order
// ============================================================
export async function initiatePeterPayPayment(params) {
    try {
        // Validate amount (minimum 500 TZS per PeterPay docs)
        if (params.amount < 500) {
            return {
                status: "error",
                message: "Minimum payment amount is 500 TZS",
            };
        }
        const response = await fetch(`${PETERPAY_API_URL}/create_order`, {
            method: "POST",
            headers: {
                "X-API-KEY": PETERPAY_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "STANY-Hosting/1.0",
            },
            body: JSON.stringify({
                amount: params.amount,
                buyer_phone: params.buyer_phone,
                buyer_name: params.buyer_name || "STANY User",
                network: params.network || "M-Pesa",
            }),
        });
        const data = await response.json();
        if (data.status === "success") {
            return {
                status: "success",
                order_id: data.order_id,
                message: data.message || "USSD push sent to customer",
            };
        }
        else {
            return {
                status: "error",
                message: data.message || "Payment initiation failed",
            };
        }
    }
    catch (error) {
        console.error("PeterPay initiate error:", error);
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
// ============================================================
// 2. CHECK PAYMENT STATUS
// POST /api/v1/order_status
// ============================================================
export async function checkPeterPayStatus(orderId) {
    try {
        const response = await fetch(`${PETERPAY_API_URL}/order_status`, {
            method: "POST",
            headers: {
                "X-API-KEY": PETERPAY_API_KEY,
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
                    net_amount: data.data.net_amount,
                    phone: data.data.phone,
                    network: data.data.network,
                    created_at: data.data.created_at,
                },
            };
        }
        else {
            return {
                status: "error",
                message: data.message || "Status check failed",
            };
        }
    }
    catch (error) {
        console.error("PeterPay status check error:", error);
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
// ============================================================
// 3. DIRECT PAYOUT (B2C)
// POST /api/v1/direct_pay
// ============================================================
export async function directPeterPayPayout(params) {
    try {
        const response = await fetch(`${PETERPAY_API_URL}/direct_pay`, {
            method: "POST",
            headers: {
                "X-API-KEY": PETERPAY_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                amount: params.amount,
                recipient_phone: params.recipient_phone,
                network: params.network,
                reason: params.reason || "STANY payout",
            }),
        });
        const data = await response.json();
        if (data.status === "success") {
            return {
                status: "success",
                reference: data.reference,
                message: data.message || "Payout sent successfully",
            };
        }
        else {
            return {
                status: "error",
                message: data.message || "Payout failed",
            };
        }
    }
    catch (error) {
        console.error("PeterPay payout error:", error);
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
// ============================================================
// 4. CHECK BALANCE
// POST /api/v1/balance_check
// ============================================================
export async function getPeterPayBalance() {
    try {
        const response = await fetch(`${PETERPAY_API_URL}/balance_check`, {
            method: "POST",
            headers: {
                "X-API-KEY": PETERPAY_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        });
        const data = await response.json();
        if (data.status === "success" && data.data) {
            return {
                status: "success",
                data: {
                    name: data.data.name,
                    balance: data.data.balance,
                    currency: data.data.currency,
                    tier: data.data.tier,
                },
            };
        }
        else {
            return {
                status: "error",
                message: data.message || "Balance check failed",
            };
        }
    }
    catch (error) {
        console.error("PeterPay balance check error:", error);
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
// ============================================================
// 5. VERIFY WEBHOOK SIGNATURE
// HMAC SHA256
// ============================================================
export function verifyPeterPayWebhook(payload, signature) {
    try {
        if (!PETERPAY_API_SECRET || !signature)
            return false;
        const calculated = crypto
            .createHmac("sha256", PETERPAY_API_SECRET)
            .update(payload, "utf8")
            .digest("hex");
        const clean = signature.replace(/^sha256=/i, "").trim().toLowerCase();
        const a = Buffer.from(calculated, "utf8");
        const b = Buffer.from(clean, "utf8");
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    catch {
        return false;
    }
}
