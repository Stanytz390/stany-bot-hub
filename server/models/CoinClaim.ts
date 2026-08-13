import mongoose from "mongoose";

/**
 * A hard ledger of gift-link claims.
 * Unique indexes guarantee one claim per user per link and one claim per
 * device/IP per link, even under concurrent requests.
 */
const CoinClaimSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: "CoinLink", required: true, index: true },
  code: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  username: { type: String, default: "" },
  ip: { type: String, default: "" },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

CoinClaimSchema.index({ linkId: 1, userId: 1 }, { unique: true });
CoinClaimSchema.index({ linkId: 1, ip: 1 }, { unique: true, partialFilterExpression: { ip: { $type: "string" } } });

export const CoinClaim = mongoose.model("CoinClaim", CoinClaimSchema);
