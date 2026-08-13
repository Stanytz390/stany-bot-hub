import mongoose from "mongoose";

/**
 * A social-media boosting service that users can buy with SQ.
 * Services are either imported from an upstream SMM panel or created by an admin.
 */
const SmmServiceSchema = new mongoose.Schema({
  serviceId: { type: Number, required: true },
  provider: { type: String, default: "px1" },
  name: { type: String, required: true },
  category: { type: String, default: "General" },
  platform: { type: String, default: "" },
  /** Price charged to the user, in SQ, per 1000 units. */
  pricePer1000Sq: { type: Number, required: true, min: 0 },
  min: { type: Number, default: 100 },
  max: { type: Number, default: 100000 },
  description: { type: String, default: "" },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
SmmServiceSchema.index({ provider: 1, serviceId: 1 }, { unique: true });

export const SmmService = mongoose.models.SmmService || mongoose.model("SmmService", SmmServiceSchema);

const SmmOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  serviceRef: { type: mongoose.Schema.Types.ObjectId, ref: "SmmService" },
  serviceId: { type: Number, required: true },
  provider: { type: String, default: "px1" },
  serviceName: { type: String, default: "" },
  link: { type: String, required: true },
  quantity: { type: Number, required: true },
  priceSq: { type: Number, required: true },
  /** Order id returned by the upstream panel, empty when handled manually. */
  remoteOrderId: { type: String, default: "" },
  startCount: { type: Number, default: 0 },
  remains: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "partial", "failed", "refunded", "canceled"],
    default: "pending"
  },
  source: { type: String, enum: ["web", "api"], default: "web" },
  note: { type: String, default: "" },
  refunded: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const SmmOrder = mongoose.models.SmmOrder || mongoose.model("SmmOrder", SmmOrderSchema);
