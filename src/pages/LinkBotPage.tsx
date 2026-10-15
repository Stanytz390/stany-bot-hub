import { useEffect, useState } from "react";
import {
Bot,
Copy,
Loader2,
Plus,
Shield,
Radio,
Trash2,
ListOrdered,
Smartphone,
RefreshCw,
CheckCircle2,
Clock,
AlertCircle,
} from "lucide-react";
import { AppShell, Surface } from "@/components/AppShell";
import { useToast } from "@/hooks/useToast";
import {
getMyLinkBots,
createLinkBot,
updateLinkBot,
deleteLinkBot,
getLinkBotCommands,
requestLinkBotPairingCode,
getLinkBotConnectionStatus,
type LinkBotRow,
type LinkBotCommand,
type LinkBotConnectionStatus,
} from "@/lib/api";

export function LinkBotPage() {
const { showToast } = useToast();

const [bots, setBots] = useState<LinkBotRow[]>([]);
const [price, setPrice] = useState(10);
const [loading, setLoading] = useState(true);
const [creating, setCreating] = useState(false);
const [showForm, setShowForm] = useState(false);
const [commands, setCommands] = useState<LinkBotCommand[]>([]);
const [showCommands, setShowCommands] = useState(false);

const [pairingNumbers, setPairingNumbers] = useState<Record<string, string>>({});
const [pairingCodes, setPairingCodes] = useState<Record<string, string>>({});
const [pairingLoading, setPairingLoading] = useState<Record<string, boolean>>({});
const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});
const [connectionStatuses, setConnectionStatuses] = useState<
Record<string, LinkBotConnectionStatus>

«({});
const [deleting, setDeleting] = useState<Record<string, boolean>>({});»

const [form, setForm] = useState({
username: "",
displayName: "",
logoUrl: "",
phoneNumber: "",
channelJid: "",
});

async function load() {
setLoading(true);

try {
  const res = await getMyLinkBots();
  setBots(res.bots);
  setPrice(res.priceSq);
} catch (err) {
  showToast(
    err instanceof Error ? err.message : "Could not load your bots",
    "error",
  );
} finally {
  setLoading(false);
}

}

useEffect(() => {
void load();

getLinkBotCommands()
  .then((res) => setCommands(res.commands))
  .catch(() => {
    // Commands will be loaded again when the API becomes available.
  });

}, []);

async function submit() {
if (!/^[a-z0-9_]{3,20}$/i.test(form.username)) {
showToast(
"Username must be 3-20 letters, numbers or underscore",
"error",
);
return;
}

setCreating(true);

try {
  const res = await createLinkBot(form);

  showToast(
    `Bot created · ${res.charged} SQ charged · balance ${res.balance} SQ`,
    "success",
  );

  setShowForm(false);
  setForm({
    username: "",
    displayName: "",
    logoUrl: "",
    phoneNumber: "",
    channelJid: "",
  });

  await load();
} catch (err) {
  showToast(
    err instanceof Error ? err.message : "Could not create the bot",
    "error",
  );
} finally {
  setCreating(false);
}

}

async function toggle(bot: LinkBotRow, key: keyof LinkBotRow) {
const next = !bot[key];

setBots((prev) =>
  prev.map((item) =>
    item._id === bot._id ? { ...item, [key]: next } : item,
  ),
);

try {
  await updateLinkBot(bot._id, { [key]: next } as Partial<LinkBotRow>);
} catch (err) {
  showToast(
    err instanceof Error ? err.message : "Could not save that setting",
    "error",
  );
  await load();
}

}

async function saveField(
bot: LinkBotRow,
patch: Partial<LinkBotRow>,
) {
try {
const saved = await updateLinkBot(bot._id, patch);

  setBots((prev) =>
    prev.map((item) => (item._id === bot._id ? saved : item)),
  );

  showToast("Settings saved", "success");
} catch (err) {
  showToast(
    err instanceof Error ? err.message : "Could not save settings",
    "error",
  );
}

}

async function requestPairing(bot: LinkBotRow) {
const phoneNumber = (pairingNumbers[bot._id] ?? bot.phoneNumber ?? "").trim();

if (!/^\+?\d{10,15}$/.test(phoneNumber.replace(/[\s()-]/g, ""))) {
  showToast(
    "Enter a valid WhatsApp number with country code, e.g. 2557XXXXXXXX",
    "error",
  );
  return;
}

setPairingLoading((prev) => ({ ...prev, [bot._id]: true }));

try {
  const result = await requestLinkBotPairingCode(bot._id, phoneNumber);

  setPairingCodes((prev) => ({
    ...prev,
    [bot._id]: result.pairingCode,
  }));

  setPairingNumbers((prev) => ({
    ...prev,
    [bot._id]: result.phoneNumber || phoneNumber,
  }));

  showToast("Pairing code generated. Enter it in WhatsApp.", "success");

  await checkConnection(bot._id, true);
} catch (err) {
  showToast(
    err instanceof Error
      ? err.message
      : "Could not generate the pairing code",
    "error",
  );
} finally {
  setPairingLoading((prev) => ({ ...prev, [bot._id]: false }));
}

}

async function checkConnection(botId: string, quiet = false) {
setStatusLoading((prev) => ({ ...prev, [botId]: true }));

try {
  const result = await getLinkBotConnectionStatus(botId);

  setConnectionStatuses((prev) => ({
    ...prev,
    [botId]: result,
  }));

  setBots((prev) =>
    prev.map((bot) =>
      bot._id === botId
        ? {
            ...bot,
            status: result.status === "deleted" ? "paused" : result.status,
            phoneNumber: result.phoneNumber || bot.phoneNumber,
          }
        : bot,
    ),
  );

  if (result.connected) {
    setPairingCodes((prev) => {
      const next = { ...prev };
      delete next[botId];
      return next;
    });

    if (!quiet) {
      showToast("WhatsApp is connected successfully", "success");
    }
  } else if (!quiet) {
    showToast("WhatsApp is not connected yet", "error");
  }
} catch (err) {
  if (!quiet) {
    showToast(
      err instanceof Error
        ? err.message
        : "Could not check connection status",
      "error",
    );
  }
} finally {
  setStatusLoading((prev) => ({ ...prev, [botId]: false }));
}

}

async function removeBot(bot: LinkBotRow) {
const confirmed = window.confirm(
"Remove @${bot.username}? This action cannot be undone from this page.",
);

if (!confirmed) return;

setDeleting((prev) => ({ ...prev, [bot._id]: true }));

try {
  await deleteLinkBot(bot._id);

  setBots((prev) => prev.filter((item) => item._id !== bot._id));

  setPairingCodes((prev) => {
    const next = { ...prev };
    delete next[bot._id];
    return next;
  });

  setConnectionStatuses((prev) => {
    const next = { ...prev };
    delete next[bot._id];
    return next;
  });

  showToast("Bot removed", "success");
} catch (err) {
  showToast(
    err instanceof Error ? err.message : "Could not remove bot",
    "error",
  );
} finally {
  setDeleting((prev) => ({ ...prev, [bot._id]: false }));
}

}

async function copyText(value: string, label: string) {
try {
await navigator.clipboard.writeText(value);
showToast("${label} copied", "success");
} catch {
showToast("Could not copy. Please copy it manually.", "error");
}
}

return (
<AppShell
title="My Link Bot"
subtitle={"Link your own WhatsApp bot for ${price} SQ"}
actions={
<button
onClick={() => setShowCommands(true)}
className="p-2 rounded-full text-pink-400 hover:bg-pink-500/10 active:scale-95 transition"
aria-label="Commands"
>
<ListOrdered className="w-5 h-5" />
</button>
}
>
<Surface className="p-4 mb-3">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
<Bot className="w-5 h-5 text-pink-400" />
</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">STANY Link Bot</p>
        <p className="text-[11px] text-gray-500">
          {commands.length}+ commands · anti-link · anti-status mention ·
          auto channel follow
        </p>
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="shrink-0 px-3 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        {price} SQ
      </button>
    </div>
  </Surface>

  {loading ? (
    <div className="py-16 flex justify-center text-pink-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ) : bots.length === 0 ? (
    <Surface className="p-8 text-center text-sm text-gray-400">
      No linked bot yet. Create one to get your personal WhatsApp menu.
    </Surface>
  ) : (
    <div className="space-y-3">
      {bots.map((bot) => {
        const connection = connectionStatuses[bot._id];
        const connected =
          connection?.connected === true || bot.status === "linked";
        const pairingCode = pairingCodes[bot._id];
        const isPairing = pairingLoading[bot._id] === true;
        const isChecking = statusLoading[bot._id] === true;

        return (
          <Surface key={bot._id} className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              {bot.logoUrl ? (
                <img
                  src={bot.logoUrl}
                  alt={bot.displayName || bot.username}
                  className="w-11 h-11 rounded-xl object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-pink-500/15 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-pink-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {bot.displayName || bot.username}
                </p>
                <p className="text-[11px] text-gray-500">
                  @{bot.username} · {bot.status}
                </p>
              </div>

              <button
                onClick={() => void removeBot(bot)}
                disabled={deleting[bot._id]}
                className="p-2 rounded-full text-red-400 hover:bg-red-500/10 active:scale-95 transition disabled:opacity-50"
                aria-label="Delete bot"
              >
                {deleting[bot._id] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                connected
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-amber-500/10 border-amber-500/20"
              }`}
            >
              {connected ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-semibold ${
                    connected ? "text-green-400" : "text-amber-400"
                  }`}
                >
                  {connected ? "WhatsApp connected" : "WhatsApp not connected"}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {connection?.phoneNumber || bot.phoneNumber || "No number set"}
                </p>
              </div>

              <button
                onClick={() => void checkConnection(bot._id)}
                disabled={isChecking}
                className="p-2 rounded-lg text-gray-300 hover:bg-white/5 disabled:opacity-50"
                aria-label="Refresh connection status"
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f0f16] border border-white/5">
              <code className="text-[11px] text-pink-300 truncate flex-1">
                {bot.code}
              </code>
              <button
                onClick={() => void copyText(bot.code, "Bot link code")}
                className="p-1.5 rounded-lg text-gray-400 hover:text-pink-400 transition"
                aria-label="Copy bot link code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {!connected && (
              <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 mt-0.5 text-pink-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">
                      Connect your WhatsApp
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Enter your WhatsApp number with its country code, then
                      request a pairing code.
                    </p>
                  </div>
                </div>

                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={
                    pairingNumbers[bot._id] ??
                    bot.phoneNumber ??
                    ""
                  }
                  onChange={(event) =>
                    setPairingNumbers((prev) => ({
                      ...prev,
                      [bot._id]: event.target.value,
                    }))
                  }
                  placeholder="2557XXXXXXXX"
                  className="w-full px-3 py-3 rounded-xl bg-[#0f0f16] border border-white/10 text-sm outline-none focus:border-pink-500/50"
                />

                <button
                  onClick={() => void requestPairing(bot)}
                  disabled={isPairing}
                  className="w-full py-3 rounded-xl bg-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
                >
                  {isPairing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating pairing code...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Request Pairing Code
                    </>
                  )}
                </button>

                {pairingCode && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-400">
                          Pairing code ready
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Open WhatsApp on your phone and use the Linked
                          Devices option to enter this code.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-center tracking-[0.2em] text-xl font-bold text-white bg-black/30 rounded-xl py-3">
                        {pairingCode}
                      </code>

                      <button
                        onClick={() =>
                          void copyText(pairingCode, "Pairing code")
                        }
                        className="p-3 rounded-xl bg-pink-500/15 text-pink-300 border border-pink-500/20"
                        aria-label="Copy pairing code"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => void checkConnection(bot._id)}
                      disabled={isChecking}
                      className="w-full py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isChecking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Check if connected
                    </button>
                  </div>
                )}
              </div>
            )}

            {connected && (
              <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-3">
                <p className="text-xs text-green-400 font-semibold">
                  Your WhatsApp is linked.
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Refresh the connection status if you want to verify it
                  again.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <LabeledInput
                label="Display name"
                defaultValue={bot.displayName}
                onSave={(value) =>
                  void saveField(bot, { displayName: value })
                }
              />

              <LabeledInput
                label="Logo URL"
                defaultValue={bot.logoUrl}
                onSave={(value) =>
                  void saveField(bot, { logoUrl: value })
                }
              />

              <LabeledInput
                label="Channel JID (auto follow + react)"
                defaultValue={bot.channelJid}
                placeholder="1203630xxxxxxxx@newsletter"
                onSave={(value) =>
                  void saveField(bot, { channelJid: value })
                }
              />

              <LabeledInput
                label="Command prefix"
                defaultValue={bot.prefix}
                onSave={(value) =>
                  void saveField(bot, { prefix: value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Toggle
                label="Anti-link"
                icon={Shield}
                on={bot.antilink}
                onClick={() => void toggle(bot, "antilink")}
              />

              <Toggle
                label="Anti-status mention"
                icon={Shield}
                on={bot.antiStatusMention}
                onClick={() => void toggle(bot, "antiStatusMention")}
              />

              <Toggle
                label="Anti-mention"
                icon={Shield}
                on={bot.antiMention}
                onClick={() => void toggle(bot, "antiMention")}
              />

              <Toggle
                label="Auto follow channel"
                icon={Radio}
                on={bot.autoFollowChannel}
                onClick={() => void toggle(bot, "autoFollowChannel")}
              />

              <Toggle
                label="Auto react channel"
                icon={Radio}
                on={bot.autoReactChannel}
                onClick={() => void toggle(bot, "autoReactChannel")}
              />
            </div>
          </Surface>
        );
      })}
    </div>
  )}

  {showForm && (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-[#14141d] border-t border-pink-500/20 p-5 space-y-3 max-h-[90dvh] overflow-y-auto">
        <div className="mx-auto w-10 h-1 rounded-full bg-white/15" />

        <p className="text-sm font-semibold">
          Create your bot link · {price} SQ
        </p>

        {(
          [
            ["username", "Username", "stany_king"],
            ["displayName", "Bot display name", "STANY KING BOT"],
            ["logoUrl", "Logo URL", "https://example.com/logo.jpg"],
            ["phoneNumber", "WhatsApp number", "2557XXXXXXXX"],
            ["channelJid", "Channel JID (optional)", "1203630xxxxxxxx@newsletter"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <div key={key}>
            <label className="text-xs text-gray-400">{label}</label>
            <input
              value={form[key]}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  [key]: event.target.value,
                }))
              }
              placeholder={placeholder}
              className="mt-1 w-full px-3 py-3 rounded-xl bg-[#0f0f16] border border-white/5 text-sm outline-none focus:border-pink-500/40"
            />
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowForm(false)}
            className="flex-1 py-3 rounded-xl bg-white/5 text-sm font-semibold active:scale-[0.98] transition"
          >
            Cancel
          </button>

          <button
            onClick={() => void submit()}
            disabled={creating}
            className="flex-1 py-3 rounded-xl bg-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Pay {price} SQ
          </button>
        </div>
      </div>
    </div>
  )}

  {showCommands && (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
      <div className="max-w-lg mx-auto rounded-2xl bg-[#14141d] border border-white/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">
            {commands.length} commands
          </p>

          <button
            onClick={() => setShowCommands(false)}
            className="text-xs text-pink-400 font-semibold"
          >
            Close
          </button>
        </div>

        {commands.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">
            No commands available.
          </p>
        ) : (
          <div className="space-y-1.5">
            {commands.map((command) => (
              <div
                key={command.name}
                className="px-3 py-2 rounded-xl bg-[#0f0f16] border border-white/5"
              >
                <p className="text-xs font-bold text-pink-300">
                  .{command.name}
                </p>
                <p className="text-[11px] text-gray-400">
                  {command.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}
</AppShell>

);
}

function LabeledInput({
label,
defaultValue,
placeholder,
onSave,
}: {
label: string;
defaultValue?: string;
placeholder?: string;
onSave: (value: string) => void;
}) {
const [value, setValue] = useState(defaultValue || "");

useEffect(() => {
setValue(defaultValue || "");
}, [defaultValue]);

return (
<div>
<label className="text-[11px] text-gray-400">{label}</label>

  <div className="mt-1 flex gap-2">
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => setValue(event.target.value)}
      className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-[#0f0f16] border border-white/5 text-xs outline-none focus:border-pink-500/40"
    />

    <button
      onClick={() => onSave(value)}
      className="px-3 rounded-xl bg-pink-500/15 border border-pink-500/25 text-pink-300 text-xs font-bold active:scale-95 transition"
    >
      Save
    </button>
  </div>
</div>

);
}

function Toggle({
label,
icon: Icon,
on,
onClick,
}: {
label: string;
icon: typeof Shield;
on: boolean;
onClick: () => void;
}) {
return (
<button
onClick={onClick}
className={"flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition active:scale-[0.98] ${ on ? "bg-pink-500/15 border-pink-500/30 text-pink-300" : "bg-[#0f0f16] border-white/5 text-gray-400" }"}
>
<Icon className="w-4 h-4 shrink-0" />

  <span className="text-[11px] font-semibold flex-1">{label}</span>

  <span
    className={`w-8 h-4 rounded-full relative transition ${
      on ? "bg-pink-500" : "bg-white/10"
    }`}
    aria-hidden="true"
  >
    <span
      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
        on ? "left-4" : "left-0.5"
      }`}
    />
  </span>
</button>

);
}

export default LinkBotPage;
