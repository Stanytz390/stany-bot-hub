import mongoose from "mongoose";

/**
 * A static/Node website hosted for the user on Heroku, optionally with a
 * custom domain the user points at the Heroku DNS target.
 */
const WebsiteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  appName: { type: String, required: true, unique: true },
  sourceUrl: { type: String, required: true },
  herokuUrl: { type: String, default: "" },
  customDomain: { type: String, default: "" },
  dnsTarget: { type: String, default: "" },
  domainStatus: { type: String, enum: ["none", "pending", "active", "failed"], default: "none" },
  priceSq: { type: Number, default: 0 },
  status: { type: String, enum: ["deploying", "running", "stopped", "failed", "deleted"], default: "deploying" },
  setupId: { type: String, default: "" },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Website = mongoose.models.Website || mongoose.model("Website", WebsiteSchema);
