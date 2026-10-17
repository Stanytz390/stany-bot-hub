import mongoose from "mongoose";
/** One row per user per reward claim (daily reward / achievement). */
const RewardClaimSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["daily", "achievement"], default: "daily" },
    key: { type: String, default: "daily" },
    amount: { type: Number, required: true },
    claimedAt: { type: Date, default: Date.now },
});
RewardClaimSchema.index({ userId: 1, kind: 1, key: 1 }, { unique: true, partialFilterExpression: { kind: "achievement" } });
export const RewardClaim = mongoose.model("RewardClaim", RewardClaimSchema);
/** Achievement plans configured by the admin. */
const AchievementSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "trophy" },
    // metric the achievement is measured against
    metric: { type: String, enum: ["deploys", "topups", "referrals", "messages", "balance"], default: "deploys" },
    target: { type: Number, required: true, min: 1 },
    rewardTx: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});
export const Achievement = mongoose.model("Achievement", AchievementSchema);
