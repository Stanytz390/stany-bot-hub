import mongoose from "mongoose";

  const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    txCoins: { type: Number, default: 0 },
    bots: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bot" }],
    usedFreeTrial: { type: Boolean, default: false },
    trialPhoneNumbers: [{ type: String }],
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: "" },
    bannedAt: { type: Date, default: null },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    paymentFailCount: { type: Number, default: 0 },
    paymentFailDate: { type: String, default: "" },
    // No default: storing an explicit null on every local signup breaks the
    // sparse unique index (nulls collide). Field is simply absent unless set.
    githubId: { type: String },
    githubUsername: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    authProvider: { type: String, enum: ["local", "github"], default: "local" },
    role: { type: String, enum: ["user", "subadmin", "admin"], default: "user" },
    verificationRequired: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }

  });

  // Unique only for documents that actually have a GitHub id (string type).
  UserSchema.index(
    { githubId: 1 },
    { unique: true, partialFilterExpression: { githubId: { $type: "string" } } }
  );

  export const User = mongoose.model("User", UserSchema);

  export interface IUser {
    _id: mongoose.Types.ObjectId;
    email: string;
    username?: string;
    passwordHash: string;
    txCoins: number;
    bots: mongoose.Types.ObjectId[];
    usedFreeTrial: boolean;
    trialPhoneNumbers: string[];
    isBanned: boolean;
    banReason: string;
    bannedAt: Date | null;
    referralCode: string;
    referredBy: mongoose.Types.ObjectId | null;
    paymentFailCount: number;
    paymentFailDate: string;
    githubId?: string | null;
    githubUsername?: string;
    emailVerified?: boolean;
    authProvider?: "local" | "github";
    role?: "user" | "subadmin" | "admin";
    verificationRequired?: boolean;
    createdAt: Date;

  }
