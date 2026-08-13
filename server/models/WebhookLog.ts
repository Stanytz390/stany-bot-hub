import mongoose from "mongoose";

/**
 * Every inbound PeterPay webhook attempt (and gateway poll result) is recorded here
 * so the admin dashboard can verify delivery, retries and credit outcomes.
 */
const WebhookLogSchema = new mongoose.Schema({
  provider: { type: String, default: "peterpay", index: true },
  source: { type: String, enum: ["webhook", "poll"], default: "webhook", index: true },
  orderId: { type: String, default: "", index: true },
  paymentStatus: { type: String, default: "" },
  outcome: { type: String, default: "pending", index: true }, // success | failed | pending | unknown | rejected | error
  ok: { type: Boolean, default: false, index: true },
  httpStatus: { type: Number, default: 200 },
  signatureValid: { type: Boolean, default: false },
  attempt: { type: Number, default: 1 },
  credited: { type: Boolean, default: false },
  amountSq: { type: Number, default: 0 },
  amountTzs: { type: Number, default: 0 },
  userEmail: { type: String, default: "" },
  network: { type: String, default: "" },
  phone: { type: String, default: "" },
  error: { type: String, default: "" },
  payload: { type: String, default: "" },
  ip: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const WebhookLog = mongoose.model("WebhookLog", WebhookLogSchema);

export async function logWebhook(entry: Record<string, unknown>) {
  try {
    await WebhookLog.create(entry as never);
  } catch (err) {
    console.error("[webhook-log] failed:", err);
  }
}
