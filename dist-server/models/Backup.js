import mongoose from "mongoose";
const BackupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    collections: [{ name: String, count: Number }],
    totalDocuments: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    createdBy: { type: String, default: "admin" },
    payload: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});
export const Backup = mongoose.model("Backup", BackupSchema);
