import mongoose from "mongoose";
const TransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["topup", "deploy", "panel", "renew", "refund", "admin_grant", "transfer_in", "transfer_out", "api_usage", "smm", "game_purchase", "movie_purchase"],
        required: true
    },
    txAmount: {
        type: Number,
        required: true
    },
    tzsAmount: {
        type: Number,
        default: 0
    },
    // ===== SonicPesa Reference - NO index:true here =====
    sonicRef: {
        type: String,
        default: ""
    },
    channelProvider: {
        type: String,
        default: ""
    },
    // ===== Receipt metadata - NO index:true here =====
    reference: {
        type: String,
        default: ""
    },
    method: {
        type: String,
        default: ""
    },
    itemName: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""
    },
    promoCode: {
        type: String,
        default: ""
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
// ✅ ALL INDEXES HERE - Only one place!
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ sonicRef: 1 });
TransactionSchema.index({ reference: 1 });
export const Transaction = mongoose.model("Transaction", TransactionSchema);
