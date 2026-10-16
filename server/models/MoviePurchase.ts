import mongoose, { Document, Model } from "mongoose";

export interface IMoviePurchase extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  priceSQ: number;
  priceTZS: number;
  status: "completed" | "refunded";
  createdAt: Date;
}

const MoviePurchaseSchema = new mongoose.Schema<IMoviePurchase>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
    priceSQ: { type: Number, default: 0 },
    priceTZS: { type: Number, default: 0 },
    status: { type: String, enum: ["completed", "refunded"], default: "completed" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MoviePurchaseSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export const MoviePurchase: Model<IMoviePurchase> =
  mongoose.models.MoviePurchase || mongoose.model<IMoviePurchase>("MoviePurchase", MoviePurchaseSchema);
