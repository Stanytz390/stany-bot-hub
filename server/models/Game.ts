import mongoose, { Document, Model } from "mongoose";

export interface IGame extends Document {
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  bannerImage?: string;
  screenshots: string[];
  trailerUrl?: string;
  category: string;
  platform: string;
  priceTZS: number;
  priceSQ: number;
  discount: number;
  rating: number;
  downloadUrl?: string;
  externalStoreUrl?: string;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new mongoose.Schema<IGame>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    coverImage: { type: String, required: true },
    bannerImage: { type: String, default: "" },
    screenshots: { type: [String], default: [] },
    trailerUrl: { type: String, default: "" },
    category: { type: String, default: "Action", index: true },
    platform: { type: String, default: "PC / Android" },
    priceTZS: { type: Number, default: 0, min: 0 },
    priceSQ: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    rating: { type: Number, default: 4.8, min: 1, max: 5 },
    downloadUrl: { type: String, default: "" },
    externalStoreUrl: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

GameSchema.index({ title: "text", description: "text", category: "text" });

export const Game: Model<IGame> = mongoose.models.Game || mongoose.model<IGame>("Game", GameSchema);
