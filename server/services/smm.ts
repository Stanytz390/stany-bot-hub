import { logger } from "../logger.js";

/**
 * ============================================================================
 * BWM XMD API ADAPTER (v2)
 * ============================================================================
 * Fully compliant with BWM XMD REST API documentation:
 *   Base URL: https://xmdapis.bwmxmd.co.ke/api
 *   Auth:     Authorization: Bearer bwm_live_xxxxxxxx
 *
 * IMPORTANT: The BWM XMD system uses "XD" as its internal currency.
 * Your main application uses "SQ" coins. This adapter simply relays the
 * `charged_xd` and `balance_after` values from BWM. Your business logic
 * (e.g., order service) should convert XD ⇄ SQ using your own exchange rate
 * if needed, or treat them as separate balances.
 * ============================================================================
 */

const API_URL = process.env.SMM_API_URL || "https://xmdapis.bwmxmd.co.ke/api";
const API_KEY = process.env.SMM_API_KEY || "";

// ---- Response wrappers from BWM XMD ----
interface BwmResponse<T> {
  success: boolean;
  data: T;
  balance_after?: number;   // XD remaining
  charged_xd?: number;      // XD deducted
  error?: string;
}

// ---- Public types (matching BWM XMD schema) ----
export interface RemoteService {
  id: number;
  name: string;
  category: string;
  provider: string;              // "px1", "px2", "px3" (REQUIRED for orders)
  price_per_1000_xd: number;
  price_per_1000_ksh: number;
  price_per_1000_local: number;
  local_currency: string;
  local_symbol: string;
  local_formatted: string;
  min: number;
  max: number;
}

export interface RemoteOrderResult {
  order_id: number;
  status: string;                // pending, processing, completed, partial, failed, refunded
  service_id: number;
  provider: string;
  link: string;
  quantity: number;
  cost_xd: number;
}

export interface RemoteOrderStatus {
  id: string | number;
  service_name: string;
  link: string;
  quantity: number;
  price_xd: number;
  status: string;                // pending, processing, completed, partial, failed, refunded
}

// ---- Helpers ----
export function providerConfigured(): boolean {
  return Boolean(API_URL && API_KEY);
}

// ---- Internal HTTP helpers (REST) ----
async function get<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  if (!providerConfigured()) {
    logger.warn("SMM provider not configured (missing API_URL or API_KEY)");
    return null;
  }

  try {
    const url = new URL(path, API_URL);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      logger.warn({ status: res.status, text: res.statusText }, "BWM XMD GET error");
      return null;
    }

    const json = (await res.json()) as BwmResponse<T>;
    if (!json.success) {
      logger.warn({ error: json.error }, "BWM XMD returned error");
      return null;
    }

    return json.data;
  } catch (err) {
    logger.warn({ err }, "BWM XMD GET failed");
    return null;
  }
}

async function post<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ data: T; balance_after?: number; charged_xd?: number } | null> {
  if (!providerConfigured()) {
    logger.warn("SMM provider not configured (missing API_URL or API_KEY)");
    return null;
  }

  try {
    const url = new URL(path, API_URL);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Handle BWM XMD specific HTTP errors
    if (res.status === 402) {
      logger.warn("BWM XMD: Insufficient XD balance (402)");
      return null;
    }

    if (!res.ok) {
      logger.warn({ status: res.status, text: res.statusText }, "BWM XMD POST error");
      return null;
    }

    const json = (await res.json()) as BwmResponse<T>;
    if (!json.success) {
      logger.warn({ error: json.error }, "BWM XMD returned error");
      return null;
    }

    return {
      data: json.data,
      balance_after: json.balance_after,
      charged_xd: json.charged_xd,
    };
  } catch (err) {
    logger.warn({ err }, "BWM XMD POST failed");
    return null;
  }
}

// ---- PUBLIC API METHODS (matching BWM XMD endpoints) ----

/**
 * 1. Fetch all services (with optional filters)
 * @param query   – e.g. "instagram" or "followers"
 * @param category – e.g. "Instagram" or "TikTok"
 */
export async function fetchRemoteServices(query?: string, category?: string): Promise<RemoteService[]> {
  const params: Record<string, string> = {};
  if (query) params.q = query;
  if (category) params.category = category;

  const data = await get<RemoteService[]>("/services", params);
  return Array.isArray(data) ? data : [];
}

/**
 * 2. Place a social media order
 * @param serviceId – the `id` from fetchRemoteServices
 * @param provider  – the `provider` from fetchRemoteServices (px1/px2/px3)
 * @param link      – public URL (Instagram/TikTok/YouTube etc.)
 * @param quantity  – must be between service.min and service.max
 *
 * Returns the order details, plus `charged_xd` (in XD) and `balance_after`.
 */
export async function placeRemoteOrder(
  serviceId: number,
  provider: string,
  link: string,
  quantity: number
): Promise<{ orderData: RemoteOrderResult; balance_after?: number; charged_xd?: number } | null> {
  const result = await post<RemoteOrderResult>("/services/order", {
    service_id: serviceId,
    provider: provider,
    link: link,
    quantity: quantity,
  });

  if (!result) return null;

  return {
    orderData: result.data,
    balance_after: result.balance_after,
    charged_xd: result.charged_xd,
  };
}

/**
 * 3. Check order status
 * @param orderId – the `order_id` returned from placeRemoteOrder
 */
export async function fetchRemoteStatus(orderId: string | number): Promise<RemoteOrderStatus | null> {
  return get<RemoteOrderStatus>(`/services/order/${orderId}`);
}

/**
 * Normalize BWM XMD status strings to your internal vocabulary
 */
export function normalizeStatus(raw?: string): string {
  const s = (raw || "").toLowerCase().trim();
  if (s.includes("complete")) return "completed";
  if (s.includes("partial")) return "partial";
  if (s.includes("progress") || s.includes("processing")) return "processing";
  if (s.includes("cancel")) return "canceled";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("refund")) return "refunded";
  return "pending";
}