import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { adminGetAllTemplates, adminUpdateTemplate } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

interface TemplateRow {
  _id: string;
  name: string;
  costTx: number;
  active: boolean;
  offerActive?: boolean;
  offerDays?: number;
  offerLabel?: string;
  offerEndsAt?: string | null;
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

/** Configure free-offer windows and pricing per bot template. */
export function AdminTemplateOffers() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await adminGetAllTemplates()); }
    catch { showToast("Could not load templates", "error"); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const patch = (id: string, data: Partial<TemplateRow>) =>
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...data } : r)));

  const save = async (row: TemplateRow) => {
    setBusy(row._id);
    try {
      await adminUpdateTemplate(row._id, {
        costTx: Number(row.costTx),
        active: row.active,
        offerActive: !!row.offerActive,
        offerDays: Number(row.offerDays) || 4,
        offerLabel: row.offerLabel || "",
        offerEndsAt: row.offerEndsAt || null,
      });
      showToast(`${row.name} updated`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not save", "error");
    }
    setBusy("");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        While an offer is live, each user can deploy that bot once for free and it runs for the offer days. After that they pay normally.
      </p>
      {rows.map((r) => (
        <div key={r._id} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{r.name}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor={`c-${r._id}`} className="mb-1 block text-xs text-muted-foreground">Cost / month (SQ)</label>
              <input id={`c-${r._id}`} type="number" min={0} className={inputCls} value={r.costTx}
                onChange={(e) => patch(r._id, { costTx: Number(e.target.value) })} />
            </div>
            <div>
              <label htmlFor={`d-${r._id}`} className="mb-1 block text-xs text-muted-foreground">Offer days</label>
              <input id={`d-${r._id}`} type="number" min={1} className={inputCls} value={r.offerDays ?? 4}
                onChange={(e) => patch(r._id, { offerDays: Number(e.target.value) })} />
            </div>
            <div>
              <label htmlFor={`e-${r._id}`} className="mb-1 block text-xs text-muted-foreground">Offer ends</label>
              <input id={`e-${r._id}`} type="date" className={inputCls}
                value={r.offerEndsAt ? String(r.offerEndsAt).slice(0, 10) : ""}
                onChange={(e) => patch(r._id, { offerEndsAt: e.target.value || null })} />
            </div>
            <div>
              <label htmlFor={`l-${r._id}`} className="mb-1 block text-xs text-muted-foreground">Offer badge</label>
              <input id={`l-${r._id}`} className={inputCls} value={r.offerLabel || ""} placeholder="FREE 4 DAYS"
                onChange={(e) => patch(r._id, { offerLabel: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={!!r.offerActive} onChange={(e) => patch(r._id, { offerActive: e.target.checked })} />
              Offer live
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={r.active} onChange={(e) => patch(r._id, { active: e.target.checked })} />
              Visible to users
            </label>
            <button onClick={() => save(r)} disabled={busy === r._id}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {busy === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
