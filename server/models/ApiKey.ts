import mongoose from "mongoose";

/** Developer API key. Keys always look like STANY-xxxxxxxxxxxxxxxxxxxxxxxx. */
const ApiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, default: "Default key" },
  key: { type: String, required: true, unique: true, index: true },
  active: { type: Boolean, default: true },
  callCount: { type: Number, default: 0 },
  sqSpent: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const ApiKey = mongoose.model("ApiKey", ApiKeySchema);

/** Log of every metered API call so users can audit their SQ spend. */
const ApiUsageSchema = new mongoose.Schema({
  keyId: { type: mongoose.Schema.Types.ObjectId, ref: "ApiKey", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  endpoint: { type: String, default: "" },
  method: { type: String, default: "GET" },
  cost: { type: Number, default: 0 },
  status: { type: Number, default: 200 },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const ApiUsage = mongoose.model("ApiUsage", ApiUsageSchema);
