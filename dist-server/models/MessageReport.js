import mongoose from "mongoose";
const MessageReportSchema = new mongoose.Schema({
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true, index: true },
    messageText: { type: String, default: "" },
    messageAuthor: { type: String, default: "" },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reporterName: { type: String, default: "" },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open", index: true },
    handledBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, index: true }
});
MessageReportSchema.index({ messageId: 1, reporterId: 1 }, { unique: true });
export const MessageReport = mongoose.model("MessageReport", MessageReportSchema);
