import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // Client-generated id used to de-duplicate optimistic bubbles against the SSE echo.
  clientId: { type: String, default: "", index: true },
  username: { type: String, required: true },
  role: { type: String, default: "user" },
  text: { type: String, required: true, maxlength: 1000 },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  replyToUsername: { type: String, default: "" },
  replyToText: { type: String, default: "" },
  deleted: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false, index: true },
  hiddenBy: { type: String, default: "" },
  hiddenReason: { type: String, default: "" },
  reportCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const Message = mongoose.model("Message", MessageSchema);
