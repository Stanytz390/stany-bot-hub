import mongoose from "mongoose";
const BotTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    githubRepo: { type: String, required: true },
    sessionIdUrl: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    shareableSlug: { type: String, required: true, unique: true },
    costTx: { type: Number, default: 10 },
    // Free-offer window: while active, deploys cost 0 SQ and run for offerDays days.
    offerActive: { type: Boolean, default: false },
    offerDays: { type: Number, default: 4 },
    offerLabel: { type: String, default: "" },
    offerEndsAt: { type: Date, default: null },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
export const BotTemplate = mongoose.model("BotTemplate", BotTemplateSchema);
