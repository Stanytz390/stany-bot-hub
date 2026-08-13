import mongoose from "mongoose";

const ManualPaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, default: "" },
  email: { type: String, default: "" },
  method: {
    type: String,
    enum: ["paypal", "minipay", "btc", "bnb", "bank", "other"],
    default: "paypal",
  },
  sqAmount: { type: Number, required: true, min: 1 },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: "USD" },
  payerEmail: { type: String, default: "" },
  reference: { type: String, default: "" },
  note: { type: String, default: "" },
  proofUrl: { type: String, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  adminNote: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const ManualPayment = mongoose.model("ManualPayment", ManualPaymentSchema);
