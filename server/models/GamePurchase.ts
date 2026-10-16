import mongoose, { Document, Model } from "mongoose";

export interface IGamePurchase extends Document {
  userId: mongoose.Types.ObjectId;
  gameId: mongoose.Types.ObjectId;
  priceSQ: number;
  priceTZS: number;
  status: "completed" | "refunded";
  createdAt: Date;
}

const GamePurchaseSchema = new mongoose.Schema<IGamePurchase>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true, index: true },
    priceSQ: { type: Number, default: 0 },
    priceTZS: { type: Number, default: 0 },
    status: { type: String, enum: ["completed", "refunded"], default: "completed" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GamePurchaseSchema.index({ userId: 1, gameId: 1 }, { unique: true });

export const GamePurchase: Model<IGamePurchase> =
  mongoose.models.GamePurchase || mongoose.model<IGamePurchase>("GamePurchase", GamePurchaseSchema);
