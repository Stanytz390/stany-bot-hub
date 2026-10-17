import mongoose from "mongoose";
const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    txAmount: { type: Number, required: true, min: 1 },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    claimedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
export const Coupon = mongoose.model("Coupon", CouponSchema);
