import mongoose from "mongoose";
const EmailOTPSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ["signup", "login", "reset"], default: "signup" },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});
EmailOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
export const EmailOTP = mongoose.model("EmailOTP", EmailOTPSchema);
