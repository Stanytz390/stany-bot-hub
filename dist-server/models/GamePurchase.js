import mongoose from "mongoose";
const GamePurchaseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true, index: true },
    priceSQ: { type: Number, default: 0 },
    priceTZS: { type: Number, default: 0 },
    status: { type: String, enum: ["completed", "refunded"], default: "completed" },
}, { timestamps: { createdAt: true, updatedAt: false } });
GamePurchaseSchema.index({ userId: 1, gameId: 1 }, { unique: true });
export const GamePurchase = mongoose.models.GamePurchase || mongoose.model("GamePurchase", GamePurchaseSchema);
