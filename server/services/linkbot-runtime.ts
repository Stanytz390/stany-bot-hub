import baileysModule, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "node:path";
import fs from "node:fs/promises";
import { LinkBot } from "../models/LinkBot.js";

const makeWASocket = ((baileysModule as unknown as { default?: unknown }).default || baileysModule) as (...args: any[]) => any;
type WhatsAppSocket = ReturnType<typeof makeWASocket>;

const AUTH_DIR = path.resolve(
  process.env.LINKBOT_AUTH_DIR || "./data/linkbot-auth"
);

const sockets = new Map<string, WhatsAppSocket>();
const pairingCodes = new Map<string, string>();
const connectionStates = new Map<string, boolean>();
const pendingConnections = new Set<string>();

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

function getAuthPath(botId: string): string {
  return path.join(AUTH_DIR, botId);
}

async function updateBotStatus(
  botId: string,
  status: "pending" | "linked" | "paused"
): Promise<void> {
  await LinkBot.findByIdAndUpdate(botId, {
    $set: {
      status,
      updatedAt: new Date(),
      ...(status === "linked" ? { lastSeenAt: new Date() } : {}),
    },
  });
}

/**
 * Request a WhatsApp pairing code.
 * This function never charges SQ.
 */
export async function requestLinkBotPairingCode(
  botId: string,
  phoneNumber: string
): Promise<string> {
  const number = normalizePhoneNumber(phoneNumber);

  if (!/^\d{10,15}$/.test(number)) {
    throw new Error(
      "Enter a valid phone number with its country calling code."
    );
  }

  const bot = await LinkBot.findById(botId);

  if (!bot || bot.status === "deleted") {
    throw new Error("Bot not found.");
  }

  const currentSocket = sockets.get(botId);

  if (currentSocket?.user) {
    throw new Error("This bot is already connected to WhatsApp.");
  }

  if (pendingConnections.has(botId)) {
    throw new Error(
      "A pairing request is already running. Please wait."
    );
  }

  pendingConnections.add(botId);

  try {
    await fs.mkdir(AUTH_DIR, { recursive: true });

    const authPath = getAuthPath(botId);
    await fs.mkdir(authPath, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(authPath);

    if (state.creds.registered) {
      throw new Error(
        "Saved WhatsApp credentials already exist. Check the connection status before requesting another code."
      );
    }

    const socket = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      browser: ["STANY HOSTING", "Chrome", "1.0.0"],
    });

    sockets.set(botId, socket);
    connectionStates.set(botId, false);

    socket.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch (error) {
        console.error(
          "[LinkBot] Could not save WhatsApp credentials:",
          error
        );
      }
    });

    socket.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        pairingCodes.delete(botId);
        connectionStates.set(botId, true);

        try {
          await LinkBot.findByIdAndUpdate(botId, {
            $set: {
              phoneNumber: number,
              status: "linked",
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          console.error(
            "[LinkBot] Could not save connected status:",
            error
          );
        }
      }

      if (connection === "close") {
        pairingCodes.delete(botId);
        connectionStates.set(botId, false);
        sockets.delete(botId);

        const statusCode = (
          lastDisconnect?.error as {
            output?: { statusCode?: number };
          } | undefined
        )?.output?.statusCode;

        const loggedOut =
          statusCode === DisconnectReason.loggedOut;

        try {
          await updateBotStatus(
            botId,
            loggedOut ? "paused" : "pending"
          );
        } catch (error) {
          console.error(
            "[LinkBot] Could not save disconnected status:",
            error
          );
        }
      }
    });

    /*
     * Pairing codes are requested only after the socket has been
     * created and the authentication state has been initialized.
     */
    const pairingCode = await socket.requestPairingCode(number);

    pairingCodes.set(botId, pairingCode);

    await LinkBot.findByIdAndUpdate(botId, {
      $set: {
        phoneNumber: number,
        status: "pending",
        updatedAt: new Date(),
      },
    });

    return pairingCode;
  } catch (error) {
    sockets.delete(botId);
    pairingCodes.delete(botId);
    connectionStates.delete(botId);

    throw error;
  } finally {
    pendingConnections.delete(botId);
  }
}

/**
 * Get the current connection status for a bot.
 */
export async function getLinkBotRuntimeStatus(botId: string) {
  const bot = await LinkBot.findById(botId).select(
    "status phoneNumber lastSeenAt"
  );

  if (!bot || bot.status === "deleted") {
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

/**
 * Close an active socket when the application needs to stop a bot.
 */
export async function stopLinkBot(botId: string): Promise<void> {
  const socket = sockets.get(botId);

  if (socket) {
    sockets.delete(botId);
    pairingCodes.delete(botId);
    connectionStates.delete(botId);

    try {
      socket.end(undefined);
    } catch (error) {
      console.error("[LinkBot] Error stopping socket:", error);
    }
  }
}
