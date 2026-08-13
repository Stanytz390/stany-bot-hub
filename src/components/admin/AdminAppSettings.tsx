import { useEffect, useState } from "react";
import { Loader2, Save, Pencil, X } from "lucide-react";
import { getAppSettings, updateAppSettings, type AppSettings } from "@/lib/api";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/useToast";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

/** Owner-only app settings: logos, channel popup and custom-repo pricing. */
export function AdminAppSettings() {
  const { showToast } = useToast();
  const { reload } = useAppSettings();
  const [s, setS] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  // Settings stay locked until the Edit button is pressed; saving locks them again.
  const [editing, setEditing] = useState(false);

  useEffect(() => { getAppSettings().then(setS).catch(() => showToast("Could not load settings", "error")); }, [showToast]);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await updateAppSettings(s);
      reload();
      setEditing(false);
      showToast("Settings saved", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not save", "error");
    }
    setSaving(false);
  };

  if (!s) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const popup = s.channelPopup;
  const daily = s.dailyReward;
  const maint = s.maintenance ?? { enabled: false, title: "", message: "" };

  return (
    <div className={`space-y-5 ${editing ? "" : "pointer-events-none opacity-70"}`}>
      <div className="pointer-events-auto flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="font-semibold text-foreground">App settings</p>
          <p className="text-xs text-muted-foreground">{editing ? "Editing — save when you are done." : "Locked. Press Edit to make changes."}</p>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition active:scale-95"
        >
          {editing ? <><X className="h-4 w-4" /> Cancel</> : <><Pencil className="h-4 w-4" /> Edit</>}
        </button>
      </div>
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground">Branding</h3>
        {(["logoUrl", "faviconUrl", "ogImageUrl"] as const).map((k) => (
          <div key={k}>
            <label htmlFor={k} className="mb-1 block text-xs text-muted-foreground">{k}</label>
            <input id={k} className={inputCls} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground">Follow-our-channel popup</h3>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={popup.enabled} onChange={(e) => setS({ ...s, channelPopup: { ...popup, enabled: e.target.checked } })} />
          Enabled
        </label>
        <div>
          <label htmlFor="p-title" className="mb-1 block text-xs text-muted-foreground">Title</label>
          <input id="p-title" className={inputCls} value={popup.title} onChange={(e) => setS({ ...s, channelPopup: { ...popup, title: e.target.value } })} />
        </div>
        <div>
          <label htmlFor="p-text" className="mb-1 block text-xs text-muted-foreground">Message</label>
          <textarea id="p-text" rows={2} className={inputCls} value={popup.text} onChange={(e) => setS({ ...s, channelPopup: { ...popup, text: e.target.value } })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="p-url" className="mb-1 block text-xs text-muted-foreground">Channel link</label>
            <input id="p-url" className={inputCls} value={popup.url} onChange={(e) => setS({ ...s, channelPopup: { ...popup, url: e.target.value } })} />
          </div>
          <div>
            <label htmlFor="p-img" className="mb-1 block text-xs text-muted-foreground">Image URL</label>
            <input id="p-img" className={inputCls} value={popup.imageUrl} onChange={(e) => setS({ ...s, channelPopup: { ...popup, imageUrl: e.target.value } })} />
          </div>
          <div>
            <label htmlFor="p-btn" className="mb-1 block text-xs text-muted-foreground">Button label</label>
            <input id="p-btn" className={inputCls} value={popup.buttonLabel} onChange={(e) => setS({ ...s, channelPopup: { ...popup, buttonLabel: e.target.value } })} />
          </div>
          <div>
            <label htmlFor="p-freq" className="mb-1 block text-xs text-muted-foreground">Show every (hours)</label>
            <input id="p-freq" type="number" min={1} className={inputCls} value={popup.frequencyHours}
              onChange={(e) => setS({ ...s, channelPopup: { ...popup, frequencyHours: Number(e.target.value) } })} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold text-foreground">Custom repo deployment</h3>
        <label className="col-span-full flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={s.manualDeployEnabled} onChange={(e) => setS({ ...s, manualDeployEnabled: e.target.checked })} />
          Allow users to deploy their own GitHub repos
        </label>
        <div>
          <label htmlFor="m-cost" className="mb-1 block text-xs text-muted-foreground">Cost per month (SQ)</label>
          <input id="m-cost" type="number" min={0} className={inputCls} value={s.manualDeployCostTx}
            onChange={(e) => setS({ ...s, manualDeployCostTx: Number(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="ad-speed" className="mb-1 block text-xs text-muted-foreground">Banner slide speed (seconds)</label>
          <input id="ad-speed" type="number" min={2} max={60} className={inputCls} value={s.adSlideSeconds ?? 6}
            onChange={(e) => setS({ ...s, adSlideSeconds: Number(e.target.value) })} />
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold text-foreground">Maintenance mode</h3>
        <label className="col-span-full flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={maint.enabled}
            onChange={(e) => setS({ ...s, maintenance: { ...maint, enabled: e.target.checked } })} />
          Put the site in maintenance mode (admins can still browse)
        </label>
        <div>
          <label htmlFor="mt-title" className="mb-1 block text-xs text-muted-foreground">Headline</label>
          <input id="mt-title" className={inputCls} value={maint.title}
            onChange={(e) => setS({ ...s, maintenance: { ...maint, title: e.target.value } })} />
        </div>
        <div>
          <label htmlFor="mt-msg" className="mb-1 block text-xs text-muted-foreground">Message</label>
          <input id="mt-msg" className={inputCls} value={maint.message}
            onChange={(e) => setS({ ...s, maintenance: { ...maint, message: e.target.value } })} />
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <h3 className="col-span-full font-semibold text-foreground">Daily reward</h3>
        <label className="col-span-full flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={daily.enabled} onChange={(e) => setS({ ...s, dailyReward: { ...daily, enabled: e.target.checked } })} />
          Enabled
        </label>
        <div>
          <label htmlFor="d-amt" className="mb-1 block text-xs text-muted-foreground">Amount (SQ)</label>
          <input id="d-amt" type="number" min={0} className={inputCls} value={daily.amount}
            onChange={(e) => setS({ ...s, dailyReward: { ...daily, amount: Number(e.target.value) } })} />
        </div>
        <div>
          <label htmlFor="d-min" className="mb-1 block text-xs text-muted-foreground">Minimum balance (SQ)</label>
          <input id="d-min" type="number" min={0} className={inputCls} value={daily.minBalance}
            onChange={(e) => setS({ ...s, dailyReward: { ...daily, minBalance: Number(e.target.value) } })} />
        </div>
        <div>
          <label htmlFor="d-cd" className="mb-1 block text-xs text-muted-foreground">Cooldown (hours)</label>
          <input id="d-cd" type="number" min={1} className={inputCls} value={daily.cooldownHours}
            onChange={(e) => setS({ ...s, dailyReward: { ...daily, cooldownHours: Number(e.target.value) } })} />
        </div>
      </section>

      {editing && (
        <button onClick={save} disabled={saving}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
        </button>
      )}
    </div>
  );
}
