import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorEmail: { type: String, default: "" },
  actorRole: { type: String, default: "" },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetLabel: { type: String, default: "" },
  before: { type: String, default: "" },
  after: { type: String, default: "" },
  meta: { type: String, default: "" },
  ip: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const AuditLog = mongoose.model("AuditLog", AuditLogSchema);

export async function writeAudit(entry: {
  action: string;
  actorId?: unknown;
  actorEmail?: string;
  actorRole?: string;
  targetId?: unknown;
  targetLabel?: string;
  before?: string;
  after?: string;
  meta?: string;
  ip?: string;
}) {
  try {
    await AuditLog.create(entry as never);
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}
