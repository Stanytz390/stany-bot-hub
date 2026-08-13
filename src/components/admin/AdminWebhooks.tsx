import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWebhookLogs, getWebhookAttempts } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, ShieldOff, History, Coins } from "lucide-react";

interface WebhookRow {
  _id: string;
  orderId: string;
  source: string;
  outcome: string;
  paymentStatus: string;
  signatureValid: boolean;
  attempt: number;
  credited: boolean;
  amountSq: number;
  amountTzs: number;
  userEmail: string;
  network: string;
  error: string;
  httpStatus: number;
  createdAt: string;
}

interface AttemptRow {
  _id: string;
  attempt: number;
  source: string;
  outcome: string;
  credited: boolean;
  signatureValid: boolean;
  httpStatus: number;
  error: string;
  createdAt: string;
}

const STATUSES = ["all", "success", "failed", "pending", "rejected", "error"];

export function AdminWebhooks() {
  const { t } = useI18n();
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getWebhookLogs({ status, q: q.trim(), page, limit: 20 });
    setRows(res?.logs || []);
    setStats(res?.stats || {});
    setPages(res?.pages || 1);
    setLoading(false);
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);

  const toggleAttempts = async (orderId: string) => {
    if (openOrder === orderId) { setOpenOrder(null); return; }
    const res = await getWebhookAttempts(orderId);
    setAttempts(res?.attempts || []);
    setOpenOrder(orderId);
  };

  const tone = (outcome: string) =>
    outcome === "success" ? "text-emerald-400 border-emerald-500/35 bg-emerald-500/10"
    : outcome === "failed" ? "text-destructive border-destructive/35 bg-destructive/10"
    : outcome === "rejected" || outcome === "error" ? "text-amber-400 border-amber-500/35 bg-amber-500/10"
    : "text-muted-foreground border-primary/20 bg-secondary";

  const icon = (outcome: string) =>
    outcome === "success" ? <CheckCircle2 className="w-3.5 h-3.5" />
    : outcome === "failed" ? <XCircle className="w-3.5 h-3.5" />
    : outcome === "rejected" ? <ShieldOff className="w-3.5 h-3.5" />
    : <Clock className="w-3.5 h-3.5" />;

  const cards = [
    { label: t("webhooks.success"), value: stats.success || 0, cls: "text-emerald-400" },
    { label: t("webhooks.failed"), value: stats.failed || 0, cls: "text-destructive" },
    { label: t("webhooks.pending"), value: stats.pending || 0, cls: "text-muted-foreground" },
    { label: t("webhooks.rejected"), value: (stats.rejected || 0) + (stats.error || 0), cls: "text-amber-400" },
    { label: "Credited", value: stats.credited || 0, cls: "text-primary" }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display font-semibold text-foreground flex-1">{t("webhooks.title")}</h2>
        <Button size="sm" variant="outline" onClick={load} className="rounded-lg">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-3">
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className={`text-xl font-display font-bold ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search order ID or email…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px]"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm rounded-xl bg-background border border-primary/25 px-3 py-2 text-foreground"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">{t("webhooks.empty")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r._id} className="glass-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${tone(r.outcome)}`}>
                  {icon(r.outcome)} {r.outcome.toUpperCase()}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/25 text-primary">{r.source}</span>
                <span className="text-xs font-mono text-foreground truncate max-w-[180px]">{r.orderId || "—"}</span>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span>{t("webhooks.attempts")}: <span className="text-foreground font-semibold">{r.attempt}</span></span>
                <span>HTTP {r.httpStatus}</span>
                <span>{r.signatureValid ? "signature ✓" : "signature ✗"}</span>
                {r.userEmail && <span className="truncate">{r.userEmail}</span>}
                {r.amountSq > 0 && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Coins className="w-3 h-3" /> {r.amountSq} SQ · TZS {r.amountTzs}
                  </span>
                )}
                <span className={r.credited ? "text-emerald-400" : "text-muted-foreground"}>
                  {r.credited ? "credited (once)" : "no credit on this delivery"}
                </span>
              </div>

              {r.error && <p className="mt-1 text-[11px] text-destructive break-words">{r.error}</p>}

              {r.orderId && (
                <button
                  onClick={() => toggleAttempts(r.orderId)}
                  className="mt-2 text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                >
                  <History className="w-3 h-3" /> {t("webhooks.retryHistory")}
                </button>
              )}

              {openOrder === r.orderId && (
                <div className="mt-2 space-y-1 border-l-2 border-primary/30 pl-3">
                  {attempts.map((a) => (
                    <div key={a._id} className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
                      <span className="text-foreground">#{a.attempt}</span>
                      <span>{a.source}</span>
                      <span className={a.outcome === "success" ? "text-emerald-400" : a.outcome === "failed" ? "text-destructive" : ""}>
                        {a.outcome}
                      </span>
                      {a.credited && <span className="text-primary">credited</span>}
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                      {a.error && <span className="text-destructive">{a.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
