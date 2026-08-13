import mongoose from "mongoose";

const PromoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  // "topup" = deposits only, "purchase" = panels/bots, "all" = everywhere
  scope: { type: String, enum: ["topup", "purchase", "all"], default: "all" },
  maxUses: { type: Number, default: 0 },          // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  minAmount: { type: Number, default: 0 },        // minimum purchase (TZS for topup, SQ for purchase)
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const PromoCode = mongoose.model("PromoCode", PromoCodeSchema);

export type PromoScope = "topup" | "purchase" | "all";

export type PromoError =
  | "Invalid or expired promo code"
  | "Promo code has expired"
  | "Promo code usage limit reached"
  | "Promo code not valid for this purchase"
  | "You already used this promo code"
  | string;

/**
 * Validates a promo code for a given user + scope + amount.
 * `amount` is TZS for top-ups and SQ for purchases; it is checked against `minAmount`.
 */
export async function resolvePromo(
  code: string,
  userId: mongoose.Types.ObjectId,
  scope: PromoScope,
  amount?: number
) {
  const upper = String(code || "").toUpperCase().trim();
  if (!upper) return { error: "Invalid or expired promo code" as const };

  const promo = await PromoCode.findOne({ code: upper });
  if (!promo || !promo.active) return { error: "Invalid or expired promo code" as const };
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return { error: "Promo code has expired" as const };
  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) return { error: "Promo code usage limit reached" as const };
  if (promo.scope !== "all" && promo.scope !== scope) return { error: "Promo code not valid for this purchase" as const };

  if (promo.minAmount > 0 && typeof amount === "number" && amount < promo.minAmount) {
    const unit = scope === "purchase" ? "SQ" : "TZS";
    return { error: `This code needs a minimum of ${promo.minAmount} ${unit}` };
  }

  if (promo.perUserLimit > 0) {
    const uses = promo.usedBy.filter(u => u.toString() === userId.toString()).length;
    if (uses >= promo.perUserLimit) return { error: "You already used this promo code" as const };
  }
  return { promo };
}

export function applyDiscount(amount: number, discountPercent: number) {
  const discount = Math.round((amount * discountPercent) / 100);
  return { discount, final: Math.max(0, amount - discount) };
}
