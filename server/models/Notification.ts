import mongoose from "mongoose";

/** Admin broadcast shown to users on their dashboard. */
const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, default: "" },
  url: { type: String, default: "" },
  level: { type: String, enum: ["info", "success", "warning"], default: "info" },
  active: { type: Boolean, default: true },
  createdBy: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export const Notification = mongoose.model("Notification", NotificationSchema);
