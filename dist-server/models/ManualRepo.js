import mongoose from "mongoose";
/** A user-supplied GitHub repository deployed manually. Admin can review/block. */
const ManualRepoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userEmail: { type: String, default: "" },
    username: { type: String, default: "" },
    repoUrl: { type: String, required: true, trim: true },
    repoKey: { type: String, required: true, index: true }, // owner/name lowercased
    appName: { type: String, default: "" },
    botId: { type: mongoose.Schema.Types.ObjectId, ref: "Bot", default: null },
    costTx: { type: Number, default: 20 },
    blocked: { type: Boolean, default: false },
    blockReason: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});
export const ManualRepo = mongoose.model("ManualRepo", ManualRepoSchema);
/** Repos blocked globally by the admin (no user may deploy them). */
const BlockedRepoSchema = new mongoose.Schema({
    repoKey: { type: String, required: true, unique: true },
    reason: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});
export const BlockedRepo = mongoose.model("BlockedRepo", BlockedRepoSchema);
export function repoKeyFromUrl(url) {
    const m = url.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
    if (!m)
        return null;
    return `${m[1]}/${m[2].replace(/\.git$/i, "")}`.toLowerCase();
}
