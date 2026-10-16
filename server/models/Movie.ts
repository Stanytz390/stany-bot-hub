import mongoose, { Document, Model } from "mongoose";

export interface IMovie extends Document {
  title: string;
  slug: string;
  synopsis: string;
  posterImage: string;
  backdropImage?: string;
  trailerUrl?: string;
  genre: string;
  releaseYear: number;
  duration: string;
  rating: number;
  maturityRating: string;
  priceTZS: number;
  priceSQ: number;
  discount: number;
  watchUrl?: string;
  externalWatchUrl?: string;
  isFeatured: boolean;
  isTrending: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MovieSchema = new mongoose.Schema<IMovie>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    synopsis: { type: String, required: true },
    posterImage: { type: String, required: true },
    backdropImage: { type: String, default: "" },
    trailerUrl: { type: String, default: "" },
    genre: { type: String, required: true, index: true },
    releaseYear: { type: Number, default: 2025 },
    duration: { type: String, default: "1h 50m" },
    rating: { type: Number, default: 8.5, min: 1, max: 10 },
    maturityRating: { type: String, default: "PG-13" },
    priceTZS: { type: Number, default: 0, min: 0 },
    priceSQ: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    watchUrl: { type: String, default: "" },
    externalWatchUrl: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false, index: true },
    isTrending: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

MovieSchema.index({ title: "text", synopsis: "text", genre: "text" });

export const Movie: Model<IMovie> =
  mongoose.models.Movie || mongoose.model<IMovie>("Movie", MovieSchema);
