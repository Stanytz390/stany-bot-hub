import mongoose from "mongoose";

const CoinLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  creatorUsername: { type: String, default: "" },
  amountPerUser: { type: Number, required: true, min: 1 },
  maxClaims: { type: Number, required: true, min: 1 },
  claims: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: { type: String, default: "" },
      ip: { type: String, default: "" },
      at: { type: Date, default: Date.now },
    },
  ],
  message: { type: String, default: "" },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const CoinLink = mongoose.model("CoinLink", CoinLinkSchema);
