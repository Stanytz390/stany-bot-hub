// ============================================================
// LINKED WHATSAPP BOT (10 SQ)
// ============================================================

export interface LinkBotRow {
_id: string;
code: string;
username: string;
displayName: string;
logoUrl: string;
phoneNumber: string;
channelJid: string;
autoFollowChannel: boolean;
autoReactChannel: boolean;
antilink: boolean;
antilinkAction: "warn" | "delete" | "kick";
antiStatusMention: boolean;
antiMention: boolean;
prefix: string;
menuFooter: string;
status: "pending" | "linked" | "paused";
priceSq: number;
createdAt: string;
}

export interface LinkBotCommand {
name: string;
category: string;
description: string;
usage?: string;
adminOnly?: boolean;
}

export interface LinkBotPairingResponse {
ok: boolean;
pairingCode: string;
status: "pending" | "linked" | "paused";
phoneNumber: string;
}

export interface LinkBotConnectionStatus {
status: "pending" | "linked" | "paused" | "deleted";
connected: boolean;
phoneNumber: string;
lastSeenAt: string | null;
}

export async function getLinkBotCommands(): Promise<{
total: number;
categories: string[];
commands: LinkBotCommand[];
}> {
const res = await fetch("${API_URL}/linkbot/commands");
const data = await res.json();

if (!res.ok) {
throw new Error(data.error || "Could not load LinkBot commands");
}

return data;
}

export async function getMyLinkBots(): Promise<{
bots: LinkBotRow[];
priceSq: number;
}> {
const res = await fetchWithAuth("/linkbot/my");
const data = await res.json();

if (!res.ok) {
throw new Error(data.error || "Could not load your bots");
}

return {
bots: data.bots || [],
priceSq: data.priceSq ?? 10,
};
}

export async function createLinkBot(input: {
username: string;
displayName?: string;
logoUrl?: string;
phoneNumber?: string;
channelJid?: string;
}): Promise<{
ok: true;
bot: LinkBotRow;
charged: number;
balance: number;
}> {
const res = await fetchWithAuth("/linkbot", {
method: "POST",
body: JSON.stringify(input),
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || "Could not create the bot");
}

return data;
}

export async function updateLinkBot(
id: string,
patch: Partial<LinkBotRow>
): Promise<LinkBotRow> {
const res = await fetchWithAuth(
"/linkbot/${encodeURIComponent(id)}",
{
method: "PATCH",
body: JSON.stringify(patch),
}
);

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || "Could not save settings");
}

return data.bot as LinkBotRow;
}

export async function deleteLinkBot(id: string): Promise<void> {
const res = await fetchWithAuth(
"/linkbot/${encodeURIComponent(id)}",
{
method: "DELETE",
}
);

const data = await res.json().catch(() => ({}));

if (!res.ok) {
throw new Error(data.error || "Could not delete the bot");
}
}

export async function getLinkBotMenu(
id: string
): Promise<{
menu: string;
logoUrl: string;
bots: {
name: string;
slug: string;
priceSq: number;
}[];
}> {
const res = await fetchWithAuth(
"/linkbot/${encodeURIComponent(id)}/menu"
);

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || "Could not load the bot menu");
}

return data;
}

/**

* Request a WhatsApp pairing code for a user's LinkBot.
* The phone number must include the country calling code.
* Example for Tanzania: 2557XXXXXXXX
  */
  export async function requestLinkBotPairingCode(
  id: string,
  phoneNumber: string
  ): Promise<LinkBotPairingResponse> {
  const res = await fetchWithAuth(
  "/linkbot/${encodeURIComponent(id)}/pairing-code",
  {
  method: "POST",
  body: JSON.stringify({
  phoneNumber,
  }),
  }
  );

const data = await res.json();

if (!res.ok) {
throw new Error(
data.error || "Could not generate the WhatsApp pairing code"
);
}

return data as LinkBotPairingResponse;
}

/**

* Read the current WhatsApp connection status for a LinkBot.
  */
  export async function getLinkBotConnectionStatus(
  id: string
  ): Promise<LinkBotConnectionStatus> {
  const res = await fetchWithAuth(
  "/linkbot/${encodeURIComponent(id)}/connection-status"
  );

const data = await res.json();

if (!res.ok) {
throw new Error(
data.error || "Could not check the WhatsApp connection status"
);
}

return data as LinkBotConnectionStatus;
}
