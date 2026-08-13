import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { LinkBot } from "../models/LinkBot.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { BotTemplate } from "../models/BotTemplate.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { LINK_BOT_COMMANDS, COMMAND_CATEGORIES, renderMenu } from "../services/linkbot-commands.js";

const router = Router();

/** One-off SQ price to link a personal WhatsApp bot. */
export const LINK_BOT_PRICE_SQ = Number(process.env.LINK_BOT_PRICE_SQ || 10);

function mapBot(b: Record<string, unknown>) {
  return {
    _id: String(b._id),
    code: b.code,
    username: b.username,
    displayName: b.displayName,
    logoUrl: b.logoUrl,
    phoneNumber: b.phoneNumber,
    channelJid: b.channelJid,
    autoFollowChannel: b.autoFollowChannel,
    autoReactChannel: b.autoReactChannel,
    antilink: b.antilink,
    antilinkAction: b.antilinkAction,
    antiStatusMention: b.antiStatusMention,
    antiMention: b.antiMention,
    prefix: b.prefix,
    menuFooter: b.menuFooter,
    status: b.status,
    priceSq: b.priceSq,
    lastSeenAt: b.lastSeenAt,
    createdAt: b.createdAt
  };
}

async function availableBots() {
  const templates = await BotTemplate.find({ active: true }).sort({ order: 1, name: 1 }).limit(60).lean();
  return (templates as unknown as Record<string, unknown>[]).map((t) => ({
    name: String(t.name || ""),
    slug: String(t.shareableSlug || t.slug || ""),
    image: String(t.imageUrl || ""),
    priceSq: Number(t.txCost || t.priceSq || 0)
  }));
}

/** Catalogue of every command the linked bot understands. Public. */
router.get("/commands", (_req, res) => {
  res.json({ total: LINK_BOT_COMMANDS.length, categories: COMMAND_CATEGORIES, commands: LINK_BOT_COMMANDS });
});

router.get("/price", (_req, res) => res.json({ priceSq: LINK_BOT_PRICE_SQ }));

/** Bots owned by the signed-in user. */
router.get("/my", authGuard, async (req: AuthRequest, res) => {
  const bots = await LinkBot.find({ userId: req.user!._id, status: { $ne: "deleted" } }).sort({ createdAt: -1 }).lean();
  res.json({ bots: (bots as unknown as Record<string, unknown>[]).map(mapBot), priceSq: LINK_BOT_PRICE_SQ });
});

const createSchema = z.object({
  username: z.string().min(2).max(24).regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, dot or underscore"),
  displayName: z.string().max(60).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional(),
  channelJid: z.string().max(120).optional()
});

/** Create a personal bot link. Charges LINK_BOT_PRICE_SQ once, refunds on failure. */
router.post("/", authGuard, banCheck, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid details" });
    return;
  }
  const taken = await LinkBot.findOne({ username: new RegExp(`^${parsed.data.username}$`, "i"), status: { $ne: "deleted" } }).lean();
  if (taken) { res.status(409).json({ error: "That username is already taken" }); return; }

  const debited = await User.findOneAndUpdate(
    { _id: req.user!._id, txCoins: { $gte: LINK_BOT_PRICE_SQ } },
    { $inc: { txCoins: -LINK_BOT_PRICE_SQ } },
    { new: true }
  );
  if (!debited) {
    res.status(402).json({ error: `Insufficient SQ. Linking a bot costs ${LINK_BOT_PRICE_SQ} SQ.` });
    return;
  }

  try {
    const code = crypto.randomBytes(6).toString("hex");
    const bot = await LinkBot.create({
      userId: req.user!._id,
      code,
      username: parsed.data.username,
      displayName: parsed.data.displayName || parsed.data.username,
      logoUrl: parsed.data.logoUrl || "",
      phoneNumber: (parsed.data.phoneNumber || "").replace(/\D/g, ""),
      channelJid: parsed.data.channelJid || process.env.STANY_CHANNEL_JID || "",
      priceSq: LINK_BOT_PRICE_SQ
    });
    await Transaction.create({
      userId: req.user!._id,
      type: "linkbot",
      txAmount: LINK_BOT_PRICE_SQ,
      tzsAmount: 0,
      status: "success",
      itemName: `WhatsApp bot link @${parsed.data.username}`,
      reference: code
    }).catch(() => {});
    res.json({ ok: true, bot: mapBot(bot.toObject()), charged: LINK_BOT_PRICE_SQ, balance: debited.txCoins });
  } catch {
    await User.updateOne({ _id: req.user!._id }, { $inc: { txCoins: LINK_BOT_PRICE_SQ } });
    res.status(500).json({ error: "Could not create the bot link. Your SQ was refunded." });
  }
});

const updateSchema = z.object({
  displayName: z.string().max(60).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional(),
  session: z.string().max(6000).optional(),
  channelJid: z.string().max(120).optional(),
  autoFollowChannel: z.boolean().optional(),
  autoReactChannel: z.boolean().optional(),
  antilink: z.boolean().optional(),
  antilinkAction: z.enum(["warn", "delete", "kick"]).optional(),
  antiStatusMention: z.boolean().optional(),
  antiMention: z.boolean().optional(),
  prefix: z.string().min(1).max(3).optional(),
  menuFooter: z.string().max(120).optional(),
  status: z.enum(["pending", "linked", "paused"]).optional()
});

router.patch("/:id", authGuard, banCheck, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body || {});
  if (!parsed.success) { res.status(400).json({ error: "Invalid settings" }); return; }
  const bot = await LinkBot.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    { ...parsed.data, updatedAt: new Date() },
    { new: true }
  );
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json({ ok: true, bot: mapBot(bot.toObject()) });
});

router.delete("/:id", authGuard, async (req: AuthRequest, res) => {
  await LinkBot.updateOne({ _id: req.params.id, userId: req.user!._id }, { status: "deleted", updatedAt: new Date() });
  res.json({ ok: true });
});

/** Rendered menu preview used by the dashboard. */
router.get("/:id/menu", authGuard, async (req: AuthRequest, res) => {
  const bot = await LinkBot.findOne({ _id: req.params.id, userId: req.user!._id }).lean();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const b = bot as unknown as Record<string, unknown>;
  const bots = await availableBots();
  res.json({
    menu: renderMenu({
      displayName: String(b.displayName || ""),
      username: String(b.username || ""),
      prefix: String(b.prefix || "."),
      footer: String(b.menuFooter || "Powered by STANY BOT HOSTING"),
      bots
    }),
    logoUrl: b.logoUrl,
    bots
  });
});

/**
 * Runtime feed consumed by the WhatsApp bot itself.
 * Public by design (the code is the secret) and read-only.
 */
router.get("/runtime/:code", async (req, res) => {
  const bot = await LinkBot.findOne({ code: req.params.code, status: { $ne: "deleted" } });
  if (!bot) { res.status(404).json({ success: false, error: "Unknown bot code" }); return; }
  bot.lastSeenAt = new Date();
  await bot.save().catch(() => {});
  const b = bot.toObject() as Record<string, unknown>;
  const bots = await availableBots();
  res.json({
    success: true,
    data: {
      username: b.username,
      display_name: b.displayName,
      logo_url: b.logoUrl,
      prefix: b.prefix,
      status: b.status,
      channel_jid: b.channelJid,
      auto_follow_channel: b.autoFollowChannel,
      auto_react_channel: b.autoReactChannel,
      antilink: b.antilink,
      antilink_action: b.antilinkAction,
      anti_status_mention: b.antiStatusMention,
      anti_mention: b.antiMention,
      commands: LINK_BOT_COMMANDS,
      available_bots: bots,
      menu: renderMenu({
        displayName: String(b.displayName || ""),
        username: String(b.username || ""),
        prefix: String(b.prefix || "."),
        footer: String(b.menuFooter || "Powered by STANY BOT HOSTING"),
        bots
      })
    }
  });
});

export default router;
