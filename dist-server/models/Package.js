import mongoose from "mongoose";
const PackageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    tzsPrice: { type: Number, required: true },
    txAmount: { type: Number, required: true },
    bonusTx: { type: Number, default: 0 },
    isBestDeal: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
});
export const Package = mongoose.model("Package", PackageSchema);
