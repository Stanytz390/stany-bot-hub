import { useEffect, useState } from "react";
import { Loader2, CheckSquare, Square, Check, X, Trash2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { adminManualPayments, adminReviewManualPayments, adminManualPaymentProof } from "@/lib/api";

interface Row {
  _id: string;
  username: string;
  email: string;
  method: string;
  sqAmount: number;
  amount: number;
  currency: string;
  reference?: string;
  payerEmail?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const FILTERS = ["pending", "approved", "rejected", "all"] as const;

export function AdminManualPayments() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [proof, setProof] = useState<string | null>(null);

  const load = (s = status) => {
    setLoading(true);
    adminManualPayments(s).then((d) => Array.isArray(d) && setRows(d)).catch(() => {}).finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(status); setSelected([]); }, [status]);

  const toggleOne = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r._id));

  const review = async (action: "approve" | "reject" | "delete", ids = selected) => {
    if (!ids.length) { showToast("Select at least one request", "error"); return; }
    if (action === "delete" && !confirm(`Delete ${ids.length} request(s)?`)) return;
    const res = await adminReviewManualPayments(ids, action);
    if (res?.ok) { showToast(`${res.affected} request(s) ${action}d`, "success"); setSelected([]); load(); }
    else showToast(res?.error || "Failed", "error");
  };

  const viewProof = async (id: string) => {
    const res = await adminManualPaymentProof(id);
    if (res?.proofUrl) setProof(res.proofUrl);
    else showToast("No screenshot uploaded", "error");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${status === f ? "bg-primary text-white" : "border border-primary/25 text-primary"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggleAll} className="inline-flex items-center gap-2 rounded-lg border border-primary/25 px-3 py-1.5 text-xs text-primary">
          {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Mark all
        </button>
        <button onClick={() => review("approve")} className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs font-medium text-white">Approve</button>
        <button onClick={() => review("reject")} className="rounded-lg bg-amber-600/80 px-3 py-1.5 text-xs font-medium text-white">Reject</button>
        <button onClick={() => review("delete")} className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white">Delete</button>
        <span className="text-xs text-muted-foreground">{selected.length} selected</span>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r._id} className="flex items-center gap-3 rounded-xl border border-primary/15 bg-[#0a0a0f]/60 p-3">
              <button onClick={() => toggleOne(r._id)} className="text-primary">
                {selected.includes(r._id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  @{r.username || r.email} · {r.sqAmount} SQ
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.method.toUpperCase()} · {r.amount} {r.currency} · {r.reference || "no ref"} · {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${r.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : r.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                {r.status}
              </span>
              <button onClick={() => viewProof(r._id)} className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-primary"><ImageIcon className="h-4 w-4" /></button>
              {r.status === "pending" && (
                <>
                  <button onClick={() => review("approve", [r._id])} className="shrink-0 rounded-lg bg-emerald-600/20 px-2 py-1.5 text-emerald-300"><Check className="h-4 w-4" /></button>
                  <button onClick={() => review("reject", [r._id])} className="shrink-0 rounded-lg bg-amber-600/20 px-2 py-1.5 text-amber-300"><X className="h-4 w-4" /></button>
                </>
              )}
              <button onClick={() => review("delete", [r._id])} className="shrink-0 rounded-lg bg-red-600/20 px-2 py-1.5 text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">No requests.</p>}
        </div>
      )}

      {proof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setProof(null)}>
          <img src={proof} alt="Payment proof" className="max-h-[85vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
