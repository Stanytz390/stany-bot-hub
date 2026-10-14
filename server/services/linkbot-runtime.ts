import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "node:path";
import fs from "node:fs/promises";
import { LinkBot } from "../models/LinkBot.js";

const AUTH_DIR = path.resolve(
  process.env.LINKBOT_AUTH_DIR || "./data/linkbot-auth"
);

const sockets = new Map<string, any>();
const pairingCodes = new Map<string, string>();
const connecting = new Set<string>();

export async function requestLinkBotPairingCode(
  botId: string,
  phoneNumber: string
): Promise<string> {
  const number = phoneNumber.replace(/\D/g, "");

  if (!/^\d{10,15}$/.test(number)) {
    throw new Error(
      "Enter a valid phone number with country code, using digits only."
    );
  }

  const bot = await LinkBot.findById(botId);

  if (!bot || bot.status === "deleted") {
    throw new Error("Bot not found.");
  }

  const existingSocket = sockets.get(botId);

  if (existingSocket?.user) {
    throw new Error("This bot is already connected to WhatsApp.");
  }

  if (connecting.has(botId)) {
    throw new Error("A connection attempt is already in progress.");
  }

  connecting.add(botId);

  try {
    const authPath = path.join(AUTH_DIR, botId);

    await fs.mkdir(authPath, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(authPath);

    if (state.creds.registered) {
      throw new Error(
        "This bot already has saved WhatsApp credentials. Check its connection status."
      );
    }

    const socket = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
    });

    sockets.set(botId, socket);

    socket.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch (error) {
        console.error("Failed to save WhatsApp credentials:", error);
      }
    });

    socket.ev.on("connection.update", async (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr && !socket.authState.creds.registered) {
        try {
          if (!pairingCodes.has(botId)) {
            const code = await socket.requestPairingCode(number);

            pairingCodes.set(botId, code);

            await LinkBot.findByIdAndUpdate(botId, {
              phoneNumber: number,
              status: "pending",
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error("Pairing code generation failed:", error);
        }
      }

      if (connection === "open") {
        pairingCodes.delete(botId);

        await LinkBot.findByIdAndUpdate(botId, {
          status: "linked",
          phoneNumber: number,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (connection === "close") {
        sockets.delete(botId);
        pairingCodes.delete(botId);

        const statusCode = (lastDisconnect?.error as any)?.output
          ?.statusCode;

        if (statusCode !== DisconnectReason.loggedOut) {
          await LinkBot.findByIdAndUpdate(botId, {
            status: "pending",
            updatedAt: new Date(),
          });
        } else {
          await LinkBot.findByIdAndUpdate(botId, {
            status: "paused",
            updatedAt: new Date(),
          });
        }
      }
    });

    const deadline = Date.now() + 30_000;

    while (Date.now() < deadline) {
      const code = pairingCodes.get(botId);

      if (code) {
        return code;
      }

      if (!sockets.has(botId)) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
      "Pairing code was not generated. Please try again."
    );
  } finally {
    connecting.delete(botId);
  }
}

export async function getLinkBotRuntimeStatus(botId: string) {
  const bot = await LinkBot.findById(botId).select(
    "status phoneNumber lastSeenAt"
  );

  if (!bot) {
    throw new Error("Bot not found.");
  }

  const socket = sockets.get(botId);

  return {
    status: bot.status,
    connected: Boolean(socket?.user),
    phoneNumber: bot.phoneNumber || "",
    lastSeenAt: bot.lastSeenAt || null,
  };
}
