import mongoose from "mongoose";

const LinkBotSchema = new mongoose.Schema(
{
userId: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
index: true,
},

code: {
  type: String,
  required: true,
  unique: true,
  index: true,
},

username: {
  type: String,
  required: true,
  trim: true,
},

displayName: {
  type: String,
  default: "",
  trim: true,
},

logoUrl: {
  type: String,
  default: "",
  trim: true,
},

phoneNumber: {
  type: String,
  default: "",
  trim: true,
},

// WhatsApp authentication state must never be exposed by API responses.
session: {
  type: String,
  default: "",
  select: false,
},

channelJid: {
  type: String,
  default: process.env.STANY_CHANNEL_JID || "",
  trim: true,
},

autoFollowChannel: {
  type: Boolean,
  default: true,
},

autoReactChannel: {
  type: Boolean,
  default: true,
},

antilink: {
  type: Boolean,
  default: true,
},

antiStatusMention: {
  type: Boolean,
  default: true,
},

antiMention: {
  type: Boolean,
  default: false,
},

antilinkAction: {
  type: String,
  enum: ["warn", "delete", "kick"],
  default: "delete",
},

prefix: {
  type: String,
  default: ".",
  trim: true,
},

menuFooter: {
  type: String,
  default: "Powered by STANY BOT HOSTING",
},

status: {
  type: String,
  enum: ["pending", "linked", "paused", "deleted"],
  default: "pending",
  index: true,
},

priceSq: {
  type: Number,
  default: 10,
  min: 0,
},

lastSeenAt: {
  type: Date,
  default: null,
},

},
{
timestamps: true,
versionKey: false,
}
);

export const LinkBot =
mongoose.models.LinkBot ||
mongoose.model("LinkBot", LinkBotSchema);
