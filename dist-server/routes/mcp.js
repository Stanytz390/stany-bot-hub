import { Router } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Bot } from "../models/Bot.js";
import { Transaction } from "../models/Transaction.js";
import { BotTemplate } from "../models/BotTemplate.js";
import { Message } from "../models/Message.js";
import { authGuard } from "../middleware/auth.js";
import { logger } from "../logger.js";
/**
 * Model Context Protocol (MCP) server for Stany Host.
 * Streamable HTTP transport (JSON-RPC 2.0 over POST /api/mcp).
 * Every call is authenticated with a personal MCP token (Bearer),
 * so tools always act as that signed-in user.
 */
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "";
const SERVER_NAME = "coinshare-hub";
const SERVER_TITLE = "CoinShare Hub";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2025-06-18";
const MCP_TOKEN_TTL = "90d";
const INSTRUCTIONS = "Read-only tools for the CoinShare Hub / Stany Host account of the connected user. " +
    "Use get_profile for SQ coin balance and account status, list_my_bots for deployed WhatsApp bots and their expiry, " +
    "list_my_transactions for coin history, list_bot_templates for bots available to deploy, and " +
    "list_community_messages for the latest public community chat. Coin transfers, top-ups and deployments are not " +
    "exposed over MCP and must be done inside the app.";
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
function clampLimit(value, fallback, max) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(Math.max(Math.trunc(n), 1), max);
}
const TOOLS = [
    {
        name: "get_profile",
        title: "Get my profile",
        description: "Return the connected user's account: username, email, SQ coin balance, role and verification status.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: READ_ONLY,
        handler: async (_args, userId) => {
            const user = await User.findById(userId)
                .select("email username txCoins role emailVerified isBanned referralCode createdAt")
                .lean();
            if (!user)
                throw new Error("Account not found");
            const u = user;
            return {
                username: u.username || null,
                email: u.email,
                sqCoins: u.txCoins ?? 0,
                role: u.role || "user",
                emailVerified: Boolean(u.emailVerified),
                banned: Boolean(u.isBanned),
                referralCode: u.referralCode || null,
                memberSince: u.createdAt,
            };
        },
    },
    {
        name: "list_my_bots",
        title: "List my bots",
        description: "List the WhatsApp bots deployed by the connected user, with status, template and expiry date.",
        inputSchema: {
            type: "object",
            properties: { limit: { type: "number", description: "Maximum bots to return (1-50, default 20)." } },
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        handler: async (args, userId) => {
            const limit = clampLimit(args.limit, 20, 50);
            const bots = await Bot.find({ userId, status: { $ne: "deleted" } })
                .sort({ deployedAt: -1 })
                .limit(limit)
                .lean();
            return bots.map((b) => {
                const bot = b;
                return {
                    id: String(bot._id),
                    appName: bot.herokuAppName,
                    template: bot.templateName || null,
                    phoneNumber: bot.phoneNumber || null,
                    status: bot.status,
                    isTrial: Boolean(bot.isTrial),
                    deployedAt: bot.deployedAt,
                    expiresAt: bot.expiresAt,
                };
            });
        },
    },
    {
        name: "list_my_transactions",
        title: "List my coin transactions",
        description: "List the connected user's SQ coin transactions (top-ups, deployments, transfers, refunds).",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Maximum transactions to return (1-100, default 20)." },
                type: { type: "string", description: "Optional filter: topup, deploy, panel, renew, refund, admin_grant, transfer_in or transfer_out." },
            },
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        handler: async (args, userId) => {
            const limit = clampLimit(args.limit, 20, 100);
            const query = { userId };
            if (typeof args.type === "string" && args.type.trim())
                query.type = args.type.trim();
            const rows = await Transaction.find(query).sort({ createdAt: -1 }).limit(limit).lean();
            return rows.map((r) => {
                const tx = r;
                return {
                    id: String(tx._id),
                    type: tx.type,
                    sqAmount: tx.txAmount,
                    tzsAmount: tx.tzsAmount || 0,
                    status: tx.status,
                    provider: tx.channelProvider || null,
                    reference: tx.speedpesaRef || null,
                    createdAt: tx.createdAt,
                };
            });
        },
    },
    {
        name: "list_bot_templates",
        title: "List bot templates",
        description: "List the bot templates currently available for deployment, with their SQ cost.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: READ_ONLY,
        handler: async () => {
            const rows = await BotTemplate.find({ active: true }).sort({ order: 1, name: 1 }).lean();
            return rows.map((r) => {
                const t = r;
                return {
                    name: t.name,
                    slug: t.shareableSlug,
                    repo: t.githubRepo,
                    costSq: t.costTx,
                    isDefault: Boolean(t.isDefault),
                };
            });
        },
    },
    {
        name: "list_community_messages",
        title: "List community messages",
        description: "Read the most recent visible messages from the public community chat.",
        inputSchema: {
            type: "object",
            properties: { limit: { type: "number", description: "Maximum messages to return (1-50, default 20)." } },
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        handler: async (args) => {
            const limit = clampLimit(args.limit, 20, 50);
            const rows = await Message.find({ deleted: { $ne: true }, hidden: { $ne: true } })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            return rows
                .map((r) => {
                const m = r;
                return {
                    id: String(m._id),
                    username: m.username,
                    role: m.role || "user",
                    text: m.text,
                    replyToUsername: m.replyToUsername || null,
                    createdAt: m.createdAt,
                };
            })
                .reverse();
        },
    },
];
// ------------------------------------------------------------------
// Token issuing (used by the in-app "Agent integrations" page)
// ------------------------------------------------------------------
router.post("/token", authGuard, (req, res) => {
    const token = jwt.sign({ userId: String(req.user._id), mcp: true }, JWT_SECRET, { expiresIn: MCP_TOKEN_TTL });
    res.json({ token, expiresInDays: 90, endpoint: "/api/mcp" });
});
// ------------------------------------------------------------------
// MCP endpoint
// ------------------------------------------------------------------
function rpcError(id, code, message) {
    return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
async function authenticate(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token)
        return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded?.userId)
            return null;
        const user = await User.findById(decoded.userId).select("_id isBanned").lean();
        if (!user || user.isBanned)
            return null;
        return user._id;
    }
    catch {
        return null;
    }
}
function unauthorized(res) {
    const host = process.env.PUBLIC_URL || "";
    res.setHeader("WWW-Authenticate", `Bearer realm="${SERVER_TITLE}", error="invalid_token"${host ? `, resource_metadata="${host}/api/mcp"` : ""}`);
    res.status(401).json(rpcError(null, -32001, "A valid MCP bearer token is required"));
}
router.get("/", (_req, res) => {
    // Streamable HTTP: no server-initiated stream on this server.
    res.status(405).json({ error: "Method Not Allowed. Use POST for MCP JSON-RPC." });
});
router.post("/", async (req, res) => {
    const body = req.body;
    const id = body?.id;
    const method = body?.method;
    if (!method) {
        res.status(400).json(rpcError(id, -32600, "Invalid JSON-RPC request"));
        return;
    }
    // Notifications carry no id and expect no body.
    const isNotification = id === undefined || id === null;
    if (method === "initialize") {
        res.json({
            jsonrpc: "2.0",
            id,
            result: {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: SERVER_NAME, title: SERVER_TITLE, version: SERVER_VERSION },
                instructions: INSTRUCTIONS,
            },
        });
        return;
    }
    if (method.startsWith("notifications/") || method === "ping") {
        if (isNotification) {
            res.status(202).end();
            return;
        }
        res.json({ jsonrpc: "2.0", id, result: {} });
        return;
    }
    if (method === "tools/list") {
        res.json({
            jsonrpc: "2.0",
            id,
            result: {
                tools: TOOLS.map((t) => ({
                    name: t.name,
                    title: t.title,
                    description: t.description,
                    inputSchema: t.inputSchema,
                    annotations: { ...t.annotations, title: t.title },
                })),
            },
        });
        return;
    }
    if (method === "tools/call") {
        const userId = await authenticate(req);
        if (!userId) {
            unauthorized(res);
            return;
        }
        const params = (body.params || {});
        const tool = TOOLS.find((t) => t.name === params.name);
        if (!tool) {
            res.json(rpcError(id, -32602, `Unknown tool: ${params.name}`));
            return;
        }
        try {
            const data = await tool.handler(params.arguments || {}, userId);
            res.json({
                jsonrpc: "2.0",
                id,
                result: {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                    structuredContent: { result: data },
                },
            });
        }
        catch (err) {
            logger.warn({ err, tool: tool.name }, "MCP tool failed");
            res.json({
                jsonrpc: "2.0",
                id,
                result: {
                    content: [{ type: "text", text: err instanceof Error ? err.message : "Tool execution failed" }],
                    isError: true,
                },
            });
        }
        return;
    }
    res.json(rpcError(id, -32601, `Method not found: ${method}`));
});
export default router;
