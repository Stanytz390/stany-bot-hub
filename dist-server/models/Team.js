import mongoose from "mongoose";
const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    billingLabel: { type: String, default: "" },
    active: { type: Boolean, default: true }
});
export const Team = mongoose.model("Team", TeamSchema);
