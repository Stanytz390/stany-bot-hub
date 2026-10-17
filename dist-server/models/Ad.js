import mongoose from "mongoose";
export const AD_PLATFORMS = [
    "youtube",
    "instagram",
    "tiktok",
    "facebook",
    "twitter",
    "whatsapp",
    "telegram",
    "betting",
    "website",
];
const AdSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    imageUrl: { type: String, required: true, trim: true },
    targetUrl: { type: String, required: true, trim: true },
    platform: { type: String, enum: AD_PLATFORMS, default: "website" },
    buttonLabel: { type: String, default: "" },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    // Per-banner scheduling: hide automatically once endsAt passes.
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    // How long this banner stays on screen while sliding (seconds, 0 = use global).
    displaySeconds: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});
export const Ad = mongoose.model("Ad", AdSchema);
export const DEFAULT_AD_LABELS = {
    youtube: "Subscribe",
    instagram: "Follow",
    tiktok: "Follow",
    facebook: "Like Page",
    twitter: "Follow",
    whatsapp: "Join Channel",
    telegram: "Join Channel",
    betting: "Register & Play",
    website: "Open Link",
};
