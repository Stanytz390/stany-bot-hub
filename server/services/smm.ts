import { logger } from "../logger.js";

/**
 * Adapter for the standard SMM-panel HTTP API (the api.php `key/action` protocol
 * used by virtually every provider). Configure with env vars:
 *   SMM_API_URL   e.g. https://provider.com/api/v2
 *   SMM_API_KEY   your reseller key
 * When they are missing, orders stay `pending` and an admin fulfils them by hand,
 * so the SQ billing flow still works end-to-end.
 */
const API_URL = process.env.SMM_API_URL || "";
const API_KEY = process.env.SMM_API_KEY || "";

export function providerConfigured(): boolean {
  return Boolean(API_URL && API_KEY);
}

async function call<T>(payload: Record<string, string | number>): Promise<T | null> {
  if (!providerConfigured()) return null;
  try {
    const body = new URLSearchParams({ key: API_KEY, ...Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])) });
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    if (!res.ok) { logger.warn({ status: res.status }, "SMM provider HTTP error"); return null; }
    return (await res.json()) as T;
  } catch (err) {
    logger.warn({ err }, "SMM provider call failed");
    return null;
  }
}

export interface RemoteService {
  service: number | string;
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
}

export async function fetchRemoteServices(): Promise<RemoteService[]> {
  const data = await call<RemoteService[]>({ action: "services" });
  return Array.isArray(data) ? data : [];
}

export async function placeRemoteOrder(serviceId: number, link: string, quantity: number): Promise<{ order?: number; error?: string } | null> {
  return call<{ order?: number; error?: string }>({ action: "add", service: serviceId, link, quantity });
}

export async function fetchRemoteStatus(orderId: string): Promise<{ status?: string; start_count?: string; remains?: string; error?: string } | null> {
  return call({ action: "status", order: orderId });
}

/** Map an upstream status string onto our own vocabulary. */
export function normalizeStatus(raw?: string): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("complete")) return "completed";
  if (s.includes("partial")) return "partial";
  if (s.includes("progress") || s.includes("processing")) return "processing";
  if (s.includes("cancel")) return "canceled";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("refund")) return "refunded";
  return "pending";
}
