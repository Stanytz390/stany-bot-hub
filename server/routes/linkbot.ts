import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { LinkBot } from "../models/LinkBot.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { BotTemplate } from "../models/BotTemplate.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import {
  LINK_BOT_COMMANDS,
  COMMAND_CATEGORIES,
  renderMenu,
} from "../services/linkbot-commands.js";
import {
  requestLinkBotPairingCode,
  getLinkBotRuntimeStatus,
} from "../services/linkbot-runtime.js";

const router = Router();

/** One-off SQ price to link a personal WhatsApp bot. */
export const LINK_BOT_PRICE_SQ = Number(
  process.env.LINK_BOT_PRICE_SQ || 10
);

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
    createdAt: b.createdAt,
  };
}

async function availableBots() {
  const templates = await BotTemplate.find({ active: true })
    .sort({ order: 1, name: 1 })
    .limit(60)
    .lean();

  return (
    templates as unknown as Record<string, unknown>[]
  ).map((t) => ({
    name: String(t.name || ""),
    slug: String(t.shareableSlug || t.slug || ""),
    image: String(t.imageUrl || ""),
    priceSq: Number(t.txCost || t.priceSq || 0),
  }));
}

/** Public command catalogue. */
router.get("/commands", (_req, res) => {
  return res.json({
    total: LINK_BOT_COMMANDS.length,
    categories: COMMAND_CATEGORIES,
    commands: LINK_BOT_COMMANDS,
  });
});

/** Current one-off linking price. */
router.get("/price", (_req, res) => {
  return res.json({ priceSq: LINK_BOT_PRICE_SQ });
});

/** List bots belonging to the signed-in user. */
router.get("/my", authGuard, async (req: AuthRequest, res) => {
  try {
    const bots = await LinkBot.find({
      userId: req.user!._id,
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      bots: (
        bots as unknown as Record<string, unknown>[]
      ).map(mapBot),
      priceSq: LINK_BOT_PRICE_SQ,
    });
  } catch (error) {
    console.error("Failed to list LinkBots:", error);

    return res.status(500).json({
      error: "Could not load your bots.",
    });
  }
});

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Use letters, numbers, dot or underscore"
    ),
  displayName: z.string().trim().max(60).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().trim().max(20).optional(),
  channelJid: z.string().trim().max(120).optional(),
});

/** Create a bot and charge SQ once. */
router.post("/", authGuard, banCheck, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body || {});

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || "Invalid details.",
    });
  }

  try {
    const username = parsed.data.username;

    const taken = await LinkBot.findOne({
      username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      status: { $ne: "deleted" },
    }).lean();

    if (taken) {
      return res.status(409).json({
        error: "That username is already taken.",
      });
    }

    const debited = await User.findOneAndUpdate(
      {
        _id: req.user!._id,
        txCoins: { $gte: LINK_BOT_PRICE_SQ },
      },
      {
        $inc: { txCoins: -LINK_BOT_PRICE_SQ },
      },
      { new: true }
    );

    if (!debited) {
      return res.status(402).json({
        error: `Insufficient SQ. Linking a bot costs ${LINK_BOT_PRICE_SQ} SQ.`,
      });
    }

    try {
      const code = crypto.randomBytes(12).toString("hex");

      const bot = await LinkBot.create({
        userId: req.user!._id,
        code,
        username,
        displayName: parsed.data.displayName || username,
        logoUrl: parsed.data.logoUrl || "",
        phoneNumber: (parsed.data.phoneNumber || "").replace(/\D/g, ""),
        channelJid:
          parsed.data.channelJid ||
          process.env.STANY_CHANNEL_JID ||
          "",
        priceSq: LINK_BOT_PRICE_SQ,
        status: "pending",
      });

      await Transaction.create({
        userId: req.user!._id,
        type: "linkbot",
        txAmount: LINK_BOT_PRICE_SQ,
        tzsAmount: 0,
        status: "success",
        itemName: `WhatsApp bot link @${username}`,
        reference: code,
      }).catch((error) => {
        console.error("Failed to record LinkBot transaction:", error);
      });

      return res.status(201).json({
        ok: true,
        bot: mapBot(bot.toObject() as Record<string, unknown>),
        charged: LINK_BOT_PRICE_SQ,
        balance: debited.txCoins,
      });
    } catch (error) {
      console.error("Failed to create LinkBot:", error);

      await User.updateOne(
        { _id: req.user!._id },
        { $inc: { txCoins: LINK_BOT_PRICE_SQ } }
      );

      return res.status(500).json({
        error: "Could not create the bot link. Your SQ was refunded.",
      });
    }
  } catch (error) {
    console.error("LinkBot creation failed:", error);

    return res.status(500).json({
      error: "Could not create the bot link.",
    });
  }
});

/** User-editable settings only. Session and status are backend-controlled. */
const updateSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().trim().max(20).optional(),
  channelJid: z.string().trim().max(120).optional(),
  autoFollowChannel: z.boolean().optional(),
  autoReactChannel: z.boolean().optional(),
  antilink: z.boolean().optional(),
  antilinkAction: z.enum(["warn", "delete", "kick"]).optional(),
  antiStatusMention: z.boolean().optional(),
  antiMention: z.boolean().optional(),
  prefix: z.string().trim().min(1).max(3).optional(),
  menuFooter: z.string().max(120).optional(),
});

router.patch(
  "/:id",
  authGuard,
  banCheck,
  async (req: AuthRequest, res) => {
    const parsed = updateSchema.safeParse(req.body || {});

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid settings.",
      });
    }

    try {
      const bot = await LinkBot.findOneAndUpdate(
        {
          _id: req.params.id,
          userId: req.user!._id,
          status: { $ne: "deleted" },
        },
        {
          $set: {
            ...parsed.data,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!bot) {
        return res.status(404).json({
          error: "Bot not found.",
        });
      }

      return res.json({
        ok: true,
        bot: mapBot(bot.toObject() as Record<string, unknown>),
      });
    } catch (error) {
      console.error("Failed to update LinkBot:", error);

      return res.status(500).json({
        error: "Could not update bot settings.",
      });
    }
  }
);

/** Soft-delete a bot. */
router.delete(
  "/:id",
  authGuard,
  banCheck,
  async (req: AuthRequest, res) => {
    try {
      const result = await LinkBot.updateOne(
        {
          _id: req.params.id,
          userId: req.user!._id,
          status: { $ne: "deleted" },
        },
        {
          $set: {
            status: "deleted",
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          error: "Bot not found.",
        });
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error("Failed to delete LinkBot:", error);

      return res.status(500).json({
        error: "Could not delete bot.",
      });
    }
  }
);

/** Dashboard menu preview. */
router.get(
  "/:id/menu",
  authGuard,
  async (req: AuthRequest, res) => {
    try {
      const bot = await LinkBot.findOne({
        _id: req.params.id,
        userId: req.user!._id,
        status: { $ne: "deleted" },
      }).lean();

      if (!bot) {
        return res.status(404).json({
          error: "Bot not found.",
        });
      }

      const b = bot as unknown as Record<string, unknown>;
      const bots = await availableBots();

      return res.json({
        menu: renderMenu({
          displayName: String(b.displayName || ""),
          username: String(b.username || ""),
          prefix: String(b.prefix || "."),
          footer: String(
            b.menuFooter || "Powered by STANY BOT HOSTING"
          ),
          bots,
        }),
        logoUrl: b.logoUrl,
        bots,
      });
    } catch (error) {
      console.error("Failed to render LinkBot menu:", error);

      return res.status(500).json({
        error: "Could not load bot menu.",
      });
    }
  }
);

/** Generate a WhatsApp pairing code for a bot owned by this user. */
router.post(
  "/:id/pairing-code",
  authGuard,
  banCheck,
  async (req: AuthRequest, res) => {
    try {
      const bot = await LinkBot.findOne({
        _id: req.params.id,
        userId: req.user!._id,
        status: { $ne: "deleted" },
      });

      if (!bot) {
        return res.status(404).json({
          error: "Bot not found.",
        });
      }

      const phoneNumber = String(req.body?.phoneNumber || "")
        .replace(/\D/g, "");

      if (!/^\d{10,15}$/.test(phoneNumber)) {
        return res.status(400).json({
          error: "Enter a valid phone number with country code.",
        });
      }

      const pairingCode = await requestLinkBotPairingCode(
        String(bot._id),
        phoneNumber
      );

      return res.json({
        ok: true,
        pairingCode,
        status: "pending",
        phoneNumber,
      });
    } catch (error) {
      console.error("Pairing code request failed:", error);

      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Could not generate pairing code.",
      });
    }
  }
);

/** Check connection status for a bot owned by this user. */
router.get(
  "/:id/connection-status",
  authGuard,
  async (req: AuthRequest, res) => {
    try {
      const bot = await LinkBot.findOne({
        _id: req.params.id,
        userId: req.user!._id,
        status: { $ne: "deleted" },
      });

      if (!bot) {
        return res.status(404).json({
          error: "Bot not found.",
        });
      }

      const status = await getLinkBotRuntimeStatus(String(bot._id));

      return res.json(status);
    } catch (error) {
      console.error("Failed to check LinkBot status:", error);

      return res.status(500).json({
        error: "Could not check connection status.",
      });
    }
  }
);

/**
 * Runtime configuration consumed by the WhatsApp bot.
 * The code acts as a secret token.
 */
router.get("/runtime/:code", async (req, res) => {
  try {
    const bot = await LinkBot.findOne({
      code: req.params.code,
      status: { $ne: "deleted" },
    }).select("-session");

    if (!bot) {
      return res.status(404).json({
        success: false,
        error: "Unknown bot code.",
      });
    }

    bot.lastSeenAt = new Date();
    await bot.save();

    const b = bot.toObject() as Record<string, unknown>;
    const bots = await availableBots();

    return res.json({
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
          footer: String(
            b.menuFooter || "Powered by STANY BOT HOSTING"
          ),
          bots,
        }),
      },
    });
  } catch (error) {
    console.error("Runtime configuration request failed:", error);

    return res.status(500).json({
      success: false,
      error: "Could not load runtime configuration.",
    });
  }
});

export default router;
