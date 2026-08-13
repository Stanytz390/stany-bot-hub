import mongoose from "mongoose";

/**
 * A personal WhatsApp bot linked by a user for a one-off fee of 10 SQ.
 * The bot runtime pulls its branding + settings from /api/linkbot/runtime/:code.
 */
const LinkBotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  /** Public code used in the pairing link and by the runtime. */
  code: { type: String, required: true, unique: true, index: true },
  /** Handle shown in the menu header, e.g. @stany. */
  username: { type: String, required: true },
  /** Display name shown at the top of the menu. */
  displayName: { type: String, default: "" },
  /** Logo/thumbnail URL used as the menu image. */
  logoUrl: { type: String, default: "" },
  /** WhatsApp number the bot is linked to (digits only). */
  phoneNumber: { type: String, default: "" },
  /** Baileys/pair session string once the user links the device. */
  session: { type: String, default: "" },
  /** Channel that the bot auto-follows and auto-reacts to. */
  channelJid: { type: String, default: process.env.STANY_CHANNEL_JID || "" },
  autoFollowChannel: { type: Boolean, default: true },
  autoReactChannel: { type: Boolean, default: true },
  antilink: { type: Boolean, default: true },
  antiStatusMention: { type: Boolean, default: true },
  antiMention: { type: Boolean, default: false },
  antilinkAction: { type: String, enum: ["warn", "delete", "kick"], default: "delete" },
  prefix: { type: String, default: "." },
  menuFooter: { type: String, default: "Powered by STANY BOT HOSTING" },
  status: { type: String, enum: ["pending", "linked", "paused", "deleted"], default: "pending" },
  priceSq: { type: Number, default: 10 },
  lastSeenAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const LinkBot = mongoose.models.LinkBot || mongoose.model("LinkBot", LinkBotSchema);
