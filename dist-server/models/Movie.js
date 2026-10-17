import mongoose from "mongoose";
const MovieSchema = new mongoose.Schema({
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
}, { timestamps: true });
MovieSchema.index({ title: "text", synopsis: "text", genre: "text" });
export const Movie = mongoose.models.Movie || mongoose.model("Movie", MovieSchema);
