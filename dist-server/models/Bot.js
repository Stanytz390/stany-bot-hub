import mongoose from "mongoose";
const BotSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    herokuAppName: { type: String, required: true, unique: true },
    phoneNumber: { type: String, default: "" },
    sessionVar: { type: String, required: true },
    deployedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    gracePeriodEnd: { type: Date, default: null },
    isTrial: { type: Boolean, default: false },
    status: { type: String, enum: ["building", "running", "stopped", "expired", "deleted"], default: "running" },
    teamName: { type: String, required: true },
    templateId: { type: String, default: "" },
    templateName: { type: String, default: "" },
    sessionIdUrl: { type: String, default: "" },
    setupId: { type: String, default: "" },
    /** How the bot was created: template deploy, custom repo, or classic deploy. */
    source: { type: String, enum: ["template", "manual", "classic"], default: "classic" },
    /** Human-readable reason the deploy was cancelled/failed (empty when healthy). */
    failReason: { type: String, default: "" }
});
export const Bot = mongoose.model("Bot", BotSchema);
