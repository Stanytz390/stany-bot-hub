import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, CheckSquare, Square, Eye, EyeOff, Pencil, Save, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { adminListAds, adminCreateAd, adminUpdateAd, adminBulkAds } from "@/lib/api";
import { PLATFORMS, getPlatform, platformIcon } from "@/lib/platforms";

interface AdRow {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetUrl: string;
  platform: string;
  buttonLabel?: string;
  active: boolean;
  order: number;
  impressions: number;
  clicks: number;
  displaySeconds?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const btnBase =
  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95";

/** Convert an ISO string to the value a datetime-local input expects. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  targetUrl: "",
  platform: "website",
  buttonLabel: "",
  order: 0,
  displaySeconds: 0,
  startsAt: "",
  endsAt: "",
};

type AdForm = typeof emptyForm;

function payloadFrom(form: AdForm) {
  return {
    title: form.title,
    subtitle: form.subtitle,
    imageUrl: form.imageUrl,
    targetUrl: form.targetUrl,
    platform: form.platform,
    buttonLabel: form.buttonLabel,
    order: Number(form.order) || 0,
    displaySeconds: Number(form.displaySeconds) || 0,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
  };
}

function AdFields({ form, setForm }: { form: AdForm; setForm: (f: AdForm) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input className={input} placeholder="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
      <input className={input} placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
      <input className={input} placeholder="Target URL (YouTube, betting, social…)" value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} />
      <select className={input} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
        {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <input className={input} placeholder={`Button label (default: ${getPlatform(form.platform).cta})`} value={form.buttonLabel} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} />
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">On-screen time (seconds, 0 = global)</span>
        <input type="number" min={0} className={input} value={form.displaySeconds} onChange={(e) => setForm({ ...form, displaySeconds: Number(e.target.value) })} />
      </div>
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">Order</span>
        <input type="number" min={0} className={input} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
      </div>
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">Starts showing</span>
        <input type="datetime-local" className={input} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
      </div>
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">Stops showing (auto-removed)</span>
        <input type="datetime-local" className={input} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
      </div>
    </div>
  );
}

export function AdminAds() {
  const { showToast } = useToast();
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<AdForm>(emptyForm);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState<AdForm>(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminListAds().then((d) => Array.isArray(d) && setAds(d)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = ads.length > 0 && selected.length === ads.length;
  const toggleAll = () => setSelected(allSelected ? [] : ads.map((a) => a._id));

  const create = async () => {
    if (!form.title || !form.imageUrl || !form.targetUrl) { showToast("Title, image URL and target URL are required", "error"); return; }
    setBusy(true);
    const res = await adminCreateAd(payloadFrom(form));
    setBusy(false);
    if (res?._id || res?.ok) {
      showToast("Banner added", "success");
      setForm(emptyForm);
      load();
    } else showToast(res?.error || "Failed to add banner", "error");
  };

  const startEdit = (ad: AdRow) => {
    setEditId(ad._id);
    setEditForm({
      title: ad.title,
      subtitle: ad.subtitle || "",
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      platform: ad.platform,
      buttonLabel: ad.buttonLabel || "",
      order: ad.order || 0,
      displaySeconds: ad.displaySeconds || 0,
      startsAt: toLocalInput(ad.startsAt),
      endsAt: toLocalInput(ad.endsAt),
    });
  };

  const saveEdit = async () => {
    setBusy(true);
    const res = await adminUpdateAd(editId, payloadFrom(editForm));
    setBusy(false);
    if (res?.error) { showToast(res.error, "error"); return; }
    showToast("Banner updated", "success");
    setEditId("");
    load();
  };

  const bulk = async (action: "activate" | "deactivate" | "delete") => {
    if (!selected.length) { showToast("Select at least one banner", "error"); return; }
    if (action === "delete" && !confirm(`Delete ${selected.length} banner(s)?`)) return;
    const res = await adminBulkAds(selected, action);
    if (res?.ok) { showToast(`${res.affected} banner(s) updated`, "success"); setSelected([]); load(); }
    else showToast(res?.error || "Failed", "error");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-display mb-4 font-semibold text-foreground">Add sliding banner</h3>
        <AdFields form={form} setForm={setForm} />
        <button onClick={create} disabled={busy} className={`${btnBase} mt-4 bg-primary text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add banner
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggleAll} className={`${btnBase} border border-primary/25 text-primary`}>
          {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Mark all
        </button>
        <button onClick={() => bulk("activate")} className={`${btnBase} bg-emerald-600 text-white`}>Activate</button>
        <button onClick={() => bulk("deactivate")} className={`${btnBase} bg-amber-600 text-white`}>Deactivate</button>
        <button onClick={() => bulk("delete")} className={`${btnBase} bg-destructive text-destructive-foreground`}>Delete</button>
        <span className="text-xs text-muted-foreground">{selected.length} selected</span>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <div key={ad._id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleOne(ad._id)} className="text-primary">
                  {selected.includes(ad._id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                </button>
                <img src={ad.imageUrl} alt={ad.title} className="h-12 w-20 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{ad.title}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <img src={platformIcon(getPlatform(ad.platform))} alt="" className="h-3 w-3 opacity-70" />
                    {getPlatform(ad.platform).label} · {ad.impressions} views · {ad.clicks} clicks
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {ad.displaySeconds ? `${ad.displaySeconds}s slide` : "global slide speed"}
                    {ad.endsAt ? ` · ends ${new Date(ad.endsAt).toLocaleString()}` : " · no end date"}
                  </p>
                </div>
                <button onClick={() => (editId === ad._id ? setEditId("") : startEdit(ad))} className="shrink-0 rounded-lg bg-primary/10 px-2 py-1.5 text-primary" title="Edit banner">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => { await adminUpdateAd(ad._id, { active: !ad.active }); load(); }}
                  className={`shrink-0 rounded-lg px-2 py-1.5 ${ad.active ? "bg-emerald-600/20 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                  title={ad.active ? "Hide banner" : "Show banner"}
                >
                  {ad.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={async () => { if (confirm("Delete this banner?")) { await adminBulkAds([ad._id], "delete"); load(); } }}
                  className="shrink-0 rounded-lg bg-destructive/15 px-2 py-1.5 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {editId === ad._id && (
                <div className="mt-4 border-t border-border pt-4">
                  <AdFields form={editForm} setForm={setEditForm} />
                  <div className="mt-3 flex gap-2">
                    <button onClick={saveEdit} disabled={busy} className={`${btnBase} bg-primary text-primary-foreground disabled:opacity-60`}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
                    </button>
                    <button onClick={() => setEditId("")} className={`${btnBase} border border-border text-muted-foreground`}>
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!ads.length && <p className="text-sm text-muted-foreground">No banners yet.</p>}
        </div>
      )}
    </div>
  );
}
