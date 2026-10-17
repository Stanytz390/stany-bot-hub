import { logger } from "../logger.js";
/**
 * ============================================================================
 * BWM XMD API ADAPTER — API v1
 * ============================================================================
 *
 * Base URL:
 *   https://pro.bwmxmd.co.ke/api/v1
 *
 * Authentication:
 *   Authorization: Bearer <API_KEY>
 *
 * Billing:
 *   BWM XMD wallet uses XD.
 *   Your application converts XD to SQ in the routes layer.
 *
 * IMPORTANT:
 *   - This adapter never deducts user SQ.
 *   - User SQ accounting remains in the routes layer.
 *   - Provider XD balance is separate from user SQ balance.
 * ============================================================================
 */
const API_URL = (process.env.SMM_API_URL ||
    "https://pro.bwmxmd.co.ke/api/v1").replace(/\/+$/, "");
const API_KEY = process.env.SMM_API_KEY || "";
const DEFAULT_PAGE_LIMIT = 500;
const MAX_PAGE_LIMIT = 500;
const REQUEST_TIMEOUT_MS = 30_000;
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export function providerConfigured() {
    return Boolean(API_URL && API_KEY.trim());
}
// ---------------------------------------------------------------------------
// Internal HTTP helpers
// ---------------------------------------------------------------------------
class BwmApiError extends Error {
    status;
    payload;
    constructor(message, status, payload) {
        super(message);
        this.status = status;
        this.payload = payload;
        this.name = "BwmApiError";
    }
}
async function request(method, path, options) {
    if (!providerConfigured()) {
        throw new BwmApiError("BWM XMD provider is not configured", 503);
    }
    const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(options?.params || {})) {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const headers = {
            Authorization: `Bearer ${API_KEY}`,
            Accept: "application/json",
        };
        if (method === "POST") {
            headers["Content-Type"] = "application/json";
        }
        const response = await fetch(url.toString(), {
            method,
            headers,
            body: method === "POST"
                ? JSON.stringify(options?.body || {})
                : undefined,
            signal: controller.signal,
        });
        const rawText = await response.text();
        let payload;
        try {
            payload = rawText ? JSON.parse(rawText) : {};
        }
        catch {
            throw new BwmApiError(`BWM XMD returned invalid JSON (HTTP ${response.status})`, response.status);
        }
        if (!response.ok) {
            const message = payload &&
                typeof payload === "object" &&
                "error" in payload &&
                typeof payload.error === "string"
                ? payload.error
                : response.statusText || "BWM XMD request failed";
            throw new BwmApiError(message, response.status, payload);
        }
        if (!payload ||
            typeof payload !== "object" ||
            !("success" in payload)) {
            throw new BwmApiError("BWM XMD returned an unexpected response format", response.status, payload);
        }
        const envelope = payload;
        if (!envelope.success) {
            throw new BwmApiError(envelope.error || "BWM XMD returned an unsuccessful response", response.status, payload);
        }
        return envelope;
    }
    catch (error) {
        if (error instanceof BwmApiError) {
            throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
            throw new BwmApiError("BWM XMD request timed out", 504);
        }
        throw new BwmApiError(error instanceof Error
            ? error.message
            : "Unknown BWM XMD network error", 502);
    }
    finally {
        clearTimeout(timeout);
    }
}
/**
 * Backward-compatible GET helper.
 * Returns only data, as expected by the original adapter functions.
 */
async function get(path, params) {
    try {
        const response = await request("GET", path, { params });
        return response.data ?? null;
    }
    catch (error) {
        logger.warn({
            status: error instanceof BwmApiError
                ? error.status
                : undefined,
            message: error instanceof Error
                ? error.message
                : String(error),
            path,
        }, "BWM XMD GET failed");
        return null;
    }
}
/**
 * POST helper.
 *
 * Returns billing metadata alongside the response data.
 */
async function post(path, body) {
    try {
        const response = await request("POST", path, { body });
        return {
            data: response.data,
            balance_after: response.balance_after,
            charged_xd: response.charged_xd,
        };
    }
    catch (error) {
        logger.warn({
            status: error instanceof BwmApiError
                ? error.status
                : undefined,
            message: error instanceof Error
                ? error.message
                : String(error),
            path,
        }, "BWM XMD POST failed");
        return null;
    }
}
// ---------------------------------------------------------------------------
// 1. Fetch one page of services
// ---------------------------------------------------------------------------
export async function fetchRemoteServicePage(options) {
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(options?.limit ?? DEFAULT_PAGE_LIMIT)));
    const offset = Math.max(0, Math.floor(options?.offset ?? 0));
    try {
        const response = await request("GET", "/services", {
            params: {
                q: options?.query?.trim() || undefined,
                category: options?.category?.trim() || undefined,
                currency: options?.currency || undefined,
                limit,
                offset,
            },
        });
        return {
            services: Array.isArray(response.data)
                ? response.data
                : [],
            total: Number.isFinite(Number(response.total))
                ? Number(response.total)
                : 0,
            balance_after: response.balance_after,
            charged_xd: response.charged_xd,
        };
    }
    catch (error) {
        logger.warn({
            status: error instanceof BwmApiError
                ? error.status
                : undefined,
            message: error instanceof Error
                ? error.message
                : String(error),
            offset,
            limit,
        }, "BWM XMD service page request failed");
        return null;
    }
}
// ---------------------------------------------------------------------------
// 2. Fetch services with optional filters
//
// This preserves the original function signature used by routes.
// ---------------------------------------------------------------------------
export async function fetchRemoteServices(query, category) {
    const all = [];
    const limit = DEFAULT_PAGE_LIMIT;
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
        const page = await fetchRemoteServicePage({
            query,
            category,
            limit,
            offset,
        });
        if (!page) {
            // Never silently treat an incomplete catalogue as complete.
            logger.warn({ offset, importedSoFar: all.length }, "BWM XMD catalogue pagination stopped after a request failure");
            return [];
        }
        const services = page.services;
        if (services.length === 0) {
            break;
        }
        all.push(...services);
        // The documentation specifies `total` at the top level.
        total = page.total;
        // Protect against a response missing valid pagination metadata.
        if (total <= 0) {
            if (services.length < limit) {
                break;
            }
            logger.warn({ offset, received: services.length }, "BWM XMD response omitted a usable total count");
            return [];
        }
        offset += services.length;
        if (offset >= total || services.length < limit) {
            break;
        }
    }
    return all;
}
// ---------------------------------------------------------------------------
// 3. Place a social media order
// ---------------------------------------------------------------------------
export async function placeRemoteOrder(serviceId, provider, link, quantity) {
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
        logger.warn({ serviceId }, "Invalid BWM XMD service ID");
        return null;
    }
    if (!provider.trim()) {
        logger.warn("Missing BWM XMD service provider");
        return null;
    }
    if (!link.trim()) {
        logger.warn("Missing BWM XMD order link");
        return null;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
        logger.warn({ quantity }, "Invalid BWM XMD order quantity");
        return null;
    }
    const result = await post("/services/order", {
        service_id: serviceId,
        provider,
        link,
        quantity,
    });
    if (!result) {
        return null;
    }
    return {
        orderData: result.data,
        balance_after: result.balance_after,
        charged_xd: result.charged_xd,
    };
}
// ---------------------------------------------------------------------------
// 4. Fetch one order's live status
// ---------------------------------------------------------------------------
export async function fetchRemoteStatus(orderId) {
    const id = String(orderId).trim();
    if (!id || id.includes("/")) {
        logger.warn({ orderId }, "Invalid BWM XMD order ID");
        return null;
    }
    return get(`/services/order/${encodeURIComponent(id)}`);
}
// ---------------------------------------------------------------------------
// 5. Fetch bulk order status (up to 100 IDs)
// ---------------------------------------------------------------------------
export async function fetchRemoteStatuses(orderIds) {
    const ids = [
        ...new Set(orderIds
            .map((id) => String(id).trim())
            .filter(Boolean)),
    ];
    if (ids.length === 0 || ids.length > 100) {
        logger.warn({ count: ids.length }, "BWM XMD bulk status requires 1 to 100 order IDs");
        return null;
    }
    const data = await get("/services/orders/status", { orders: ids.join(",") });
    return data && typeof data === "object" ? data : null;
}
// ---------------------------------------------------------------------------
// 6. Fetch order history
// ---------------------------------------------------------------------------
export async function fetchRemoteOrders(options) {
    const limit = Math.min(200, Math.max(1, Math.floor(options?.limit ?? 50)));
    const offset = Math.max(0, Math.floor(options?.offset ?? 0));
    try {
        const response = await request("GET", "/services/orders", {
            params: {
                limit,
                offset,
                status: options?.status || undefined,
                refresh: options?.refresh === undefined
                    ? undefined
                    : options.refresh
                        ? 1
                        : 0,
            },
        });
        return {
            orders: Array.isArray(response.data)
                ? response.data
                : [],
            balance_after: response.balance_after,
            charged_xd: response.charged_xd,
        };
    }
    catch (error) {
        logger.warn({
            status: error instanceof BwmApiError
                ? error.status
                : undefined,
            message: error instanceof Error
                ? error.message
                : String(error),
        }, "BWM XMD order history request failed");
        return null;
    }
}
// ---------------------------------------------------------------------------
// 7. Normalize provider statuses
// ---------------------------------------------------------------------------
export function normalizeStatus(raw) {
    const status = (raw || "")
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");
    switch (status) {
        case "completed":
        case "complete":
        case "success":
        case "successful":
            return "completed";
        case "processing":
        case "in_progress":
        case "inprogress":
            return "processing";
        case "partial":
        case "partially_completed":
        case "partial_complete":
            return "partial";
        case "failed":
        case "failure":
        case "error":
        case "rejected":
            return "failed";
        case "refunded":
        case "refund":
            return "refunded";
        case "canceled":
        case "cancelled":
        case "cancel":
            return "canceled";
        case "pending":
        case "awaiting":
        case "queued":
        default:
            return "pending";
    }
}
// ---------------------------------------------------------------------------
// 8. Safely parse numeric fields returned as strings
// ---------------------------------------------------------------------------
export function parseRemoteNumber(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
