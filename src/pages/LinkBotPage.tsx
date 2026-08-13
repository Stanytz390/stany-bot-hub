import { useEffect, useState } from "react";
import { Bot, Copy, Loader2, Plus, Shield, Radio, Trash2, ListOrdered } from "lucide-react";
import { AppShell, Surface } from "@/components/AppShell";
import { useToast } from "@/hooks/useToast";
import {
  getMyLinkBots,
  createLinkBot,
  updateLinkBot,
  deleteLinkBot,
  getLinkBotCommands,
  type LinkBotRow,
  type LinkBotCommand,
} from "@/lib/api";

/** Personal WhatsApp bot link — 10 SQ, own name, own logo, 50+ commands. */
export function LinkBotPage() {
  const { showToast } = useToast();
  const [bots, setBots] = useState<LinkBotRow[]>([]);
  const [price, setPrice] = useState(10);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [commands, setCommands] = useState<LinkBotCommand[]>([]);
  const [showCommands, setShowCommands] = useState(false);

  const [form, setForm] = useState({ username: "", displayName: "", logoUrl: "", phoneNumber: "", channelJid: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await getMyLinkBots();
      setBots(res.bots);
      setPrice(res.priceSq);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    getLinkBotCommands().then((r) => setCommands(r.commands)).catch(() => {});
  }, []);

  async function submit() {
    if (!/^[a-z0-9_]{3,20}$/i.test(form.username)) {
      showToast("Username must be 3-20 letters, numbers or underscore", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await createLinkBot(form);
      showToast(`Bot linked · ${res.charged} SQ charged · balance ${res.balance} SQ`, "success");
      setShowForm(false);
      setForm({ username: "", displayName: "", logoUrl: "", phoneNumber: "", channelJid: "" });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create the bot", "error");
    } finally {
      setCreating(false);
    }
  }

  async function toggle(bot: LinkBotRow, key: keyof LinkBotRow) {
    const next = !bot[key];
    setBots((prev) => prev.map((b) => (b._id === bot._id ? { ...b, [key]: next } : b)));
    try {
      await updateLinkBot(bot._id, { [key]: next } as Partial<LinkBotRow>);
    } catch {
      showToast("Could not save that setting", "error");
      load();
    }
  }

  async function saveField(bot: LinkBotRow, patch: Partial<LinkBotRow>) {
    try {
      const saved = await updateLinkBot(bot._id, patch);
      setBots((prev) => prev.map((b) => (b._id === bot._id ? saved : b)));
      showToast("Saved", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save", "error");
    }
  }

  return (
    <AppShell
      title="My Link Bot"
      subtitle={`Link your own WhatsApp bot for ${price} SQ`}
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
              {commands.length}+ commands · anti-link · anti-status mention · auto channel follow
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 px-3 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" /> {price} SQ
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
          {bots.map((b) => (
            <Surface key={b._id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.displayName} className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-pink-500/15 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-pink-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{b.displayName || b.username}</p>
                  <p className="text-[11px] text-gray-500">@{b.username} · {b.status}</p>
                </div>
                <button
                  onClick={async () => {
                    await deleteLinkBot(b._id);
                    showToast("Bot removed", "success");
                    load();
                  }}
                  className="p-2 rounded-full text-red-400 hover:bg-red-500/10 active:scale-95 transition"
                  aria-label="Delete bot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f0f16] border border-white/5">
                <code className="text-[11px] text-pink-300 truncate flex-1">{b.code}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(b.code);
                    showToast("Link code copied", "success");
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-pink-400 transition"
                  aria-label="Copy code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="grid gap-2">
                <LabeledInput
                  label="Display name"
                  defaultValue={b.displayName}
                  onSave={(v) => saveField(b, { displayName: v })}
                />
                <LabeledInput
                  label="Logo URL"
                  defaultValue={b.logoUrl}
                  onSave={(v) => saveField(b, { logoUrl: v })}
                />
                <LabeledInput
                  label="Channel JID (auto follow + react)"
                  defaultValue={b.channelJid}
                  placeholder="1203630xxxxxxxx@newsletter"
                  onSave={(v) => saveField(b, { channelJid: v })}
                />
                <LabeledInput
                  label="Command prefix"
                  defaultValue={b.prefix}
                  onSave={(v) => saveField(b, { prefix: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Anti-link" icon={Shield} on={b.antilink} onClick={() => toggle(b, "antilink")} />
                <Toggle
                  label="Anti-status mention"
                  icon={Shield}
                  on={b.antiStatusMention}
                  onClick={() => toggle(b, "antiStatusMention")}
                />
                <Toggle label="Anti-mention" icon={Shield} on={b.antiMention} onClick={() => toggle(b, "antiMention")} />
                <Toggle
                  label="Auto follow channel"
                  icon={Radio}
                  on={b.autoFollowChannel}
                  onClick={() => toggle(b, "autoFollowChannel")}
                />
                <Toggle
                  label="Auto react channel"
                  icon={Radio}
                  on={b.autoReactChannel}
                  onClick={() => toggle(b, "autoReactChannel")}
                />
              </div>
            </Surface>
          ))}
        </div>
      )}

      {/* Create sheet */}
      {showForm && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-3xl bg-[#14141d] border-t border-pink-500/20 p-5 space-y-3">
            <div className="mx-auto w-10 h-1 rounded-full bg-white/15" />
            <p className="text-sm font-semibold">Create your bot link · {price} SQ</p>
            {(
              [
                ["username", "Username", "stany_king"],
                ["displayName", "Bot display name", "STANY KING BOT"],
                ["logoUrl", "Logo URL", "https://…/logo.jpg"],
                ["phoneNumber", "WhatsApp number", "2557XXXXXXXX"],
                ["channelJid", "Channel JID (optional)", "1203630xxxxxxxx@newsletter"],
              ] as const
            ).map(([key, label, ph]) => (
              <div key={key}>
                <label className="text-xs text-gray-400">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
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
                onClick={submit}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Pay {price} SQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command catalogue */}
      {showCommands && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
          <div className="max-w-lg mx-auto rounded-2xl bg-[#14141d] border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">{commands.length} commands</p>
              <button onClick={() => setShowCommands(false)} className="text-xs text-pink-400 font-semibold">
                Close
              </button>
            </div>
            <div className="space-y-1.5">
              {commands.map((c) => (
                <div key={c.name} className="px-3 py-2 rounded-xl bg-[#0f0f16] border border-white/5">
                  <p className="text-xs font-bold text-pink-300">.{c.name}</p>
                  <p className="text-[11px] text-gray-400">{c.description}</p>
                </div>
              ))}
            </div>
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
  return (
    <div>
      <label className="text-[11px] text-gray-400">{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl bg-[#0f0f16] border border-white/5 text-xs outline-none focus:border-pink-500/40"
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
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition active:scale-[0.98] ${
        on ? "bg-pink-500/15 border-pink-500/30 text-pink-300" : "bg-[#0f0f16] border-white/5 text-gray-400"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[11px] font-semibold flex-1">{label}</span>
      <span
        className={`w-8 h-4 rounded-full relative transition ${on ? "bg-pink-500" : "bg-white/10"}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export default LinkBotPage;
