import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { PageLoader } from "@/components/PageLoader";
import {
  getDeployHistory,
  getRewardHistory,
  getTransactions,
  type DeployHistoryItem,
  type RewardHistoryItem,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  Rocket,
  Gift,
  Trophy,
  AlertTriangle,
  Coins,
  GitBranch,
  Bot,
  Search,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Receipt as ReceiptIcon,
  X,
} from "lucide-react";

type Tab = "deploys" | "rewards" | "payments";
type StatusFilter = "all" | "pending" | "success" | "failed";

interface TxRow {
  _id?: string;
  id?: string;
  type?: string;
  status?: string;
  amount?: number;
  txAmount?: number;
  reference?: string;
  orderId?: string;
  method?: string;
  createdAt?: string;
}

function fmt(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function normalizeStatus(status: string, cancelled = false): StatusFilter {
  const s = (status || "").toLowerCase();
  if (cancelled || ["failed", "cancelled", "canceled", "blocked", "stopped", "expired", "rejected"].includes(s))
    return "failed";
  if (["pending", "processing", "queued", "awaiting", "initiated"].includes(s)) return "pending";
  if (["success", "successful", "completed", "approved", "running", "active", "paid"].includes(s)) return "success";
  return "pending";
}

function StatusChip({ status, cancelled }: { status: string; cancelled?: boolean }) {
  const kind = normalizeStatus(status, cancelled);
  const tone =
    kind === "success"
      ? "bg-primary/12 text-primary border-primary/25"
      : kind === "failed"
        ? "bg-destructive/12 text-destructive border-destructive/25"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${tone}`}>
      {status}
    </span>
  );
}

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed" },
];

export default function History() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("deploys");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const [deploys, setDeploys] = useState<DeployHistoryItem[]>([]);
  const [rewards, setRewards] = useState<RewardHistoryItem[]>([]);
  const [payments, setPayments] = useState<TxRow[]>([]);
  const [earned, setEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, r, p] = await Promise.all([
          getDeployHistory().catch(() => [] as DeployHistoryItem[]),
          getRewardHistory().catch(() => ({ items: [] as RewardHistoryItem[], totalEarned: 0, dailyCount: 0 })),
          getTransactions().catch(() => [] as TxRow[]),
        ]);
        setDeploys(d);
        setRewards(r.items);
        setEarned(r.totalEarned);
        setPayments(Array.isArray(p) ? p : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const dir = sortDesc ? -1 : 1;

  const visibleDeploys = useMemo(
    () =>
      deploys
        .filter((d) => status === "all" || normalizeStatus(d.status, d.cancelled) === status)
        .filter((d) => !q || `${d.appName} ${d.label} ${d.reason ?? ""}`.toLowerCase().includes(q))
        .sort((a, b) => (new Date(a.deployedAt).getTime() - new Date(b.deployedAt).getTime()) * dir),
    [deploys, status, q, dir],
  );

  const visibleRewards = useMemo(
    () =>
      rewards
        .filter(() => status === "all" || status === "success")
        .filter((r) => !q || `${r.title} ${r.kind}`.toLowerCase().includes(q))
        .sort((a, b) => (new Date(a.claimedAt).getTime() - new Date(b.claimedAt).getTime()) * dir),
    [rewards, status, q, dir],
  );

  const visiblePayments = useMemo(
    () =>
      payments
        .filter((p) => status === "all" || normalizeStatus(p.status || "") === status)
        .filter(
          (p) =>
            !q ||
            `${p.reference ?? ""} ${p.orderId ?? ""} ${p.type ?? ""} ${p.method ?? ""}`.toLowerCase().includes(q),
        )
        .sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) * dir),
    [payments, status, q, dir],
  );

  if (loading) return <PageLoader />;

  const tabs: { id: Tab; label: string; icon: typeof Rocket; count: number }[] = [
    { id: "deploys", label: "Deploys", icon: Rocket, count: visibleDeploys.length },
    { id: "rewards", label: "Rewards", icon: Gift, count: visibleRewards.length },
    { id: "payments", label: "Payments", icon: ReceiptIcon, count: visiblePayments.length },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title="History — Stany Hosting" description="Your deploy history, payments, reward claims and achievements on Stany Hosting." />

      <header className="sticky top-0 z-30 border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-bold">{t("History") || "History"}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1.5">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === tb.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tb.icon className="mr-1.5 inline h-4 w-4" /> {tb.label} ({tb.count})
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search app name, reference or order id…"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-sm outline-none focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setSortDesc((s) => !s)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium hover:border-primary"
          >
            {sortDesc ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpWideNarrow className="h-4 w-4" />}
            {sortDesc ? "Newest first" : "Oldest first"}
          </button>
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                status === s.id
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {tab === "deploys" && (
          <section className="space-y-3">
            {visibleDeploys.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No deploys match your filters.
              </p>
            )}
            {visibleDeploys.map((d) => (
              <article key={d.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {d.kind === "repo" ? <GitBranch className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-primary" />}
                      <h2 className="truncate font-semibold">{d.appName}</h2>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.label}</p>
                  </div>
                  <StatusChip status={d.status} cancelled={d.cancelled} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <div><dt className="opacity-70">Deployed</dt><dd className="font-medium text-foreground">{fmt(d.deployedAt)}</dd></div>
                  <div><dt className="opacity-70">Expires</dt><dd className="font-medium text-foreground">{fmt(d.expiresAt)}</dd></div>
                  <div><dt className="opacity-70">Type</dt><dd className="font-medium text-foreground">{d.isTrial ? "Trial / offer" : d.kind === "repo" ? "Custom repo" : "Template"}</dd></div>
                  <div><dt className="opacity-70">Cost</dt><dd className="font-medium text-foreground">{d.costTx == null ? "—" : `${d.costTx} SQ`}</dd></div>
                </dl>

                {d.reason && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{d.reason}</span>
                  </p>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === "rewards" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
              <span className="text-sm font-medium">Total earned from rewards</span>
              <span className="flex items-center gap-1.5 font-display text-lg font-bold text-primary">
                <Coins className="h-4 w-4" /> {earned} SQ
              </span>
            </div>

            {visibleRewards.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No rewards match your filters.
              </p>
            )}
            {visibleRewards.map((r) => (
              <article key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  {r.kind === "daily" ? <Gift className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold">{r.title}</h2>
                  <p className="text-xs text-muted-foreground">{fmt(r.claimedAt)}</p>
                </div>
                <span className="font-display font-bold text-primary">+{r.amount} SQ</span>
              </article>
            ))}
          </section>
        )}

        {tab === "payments" && (
          <section className="space-y-3">
            {visiblePayments.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No payments match your filters.
              </p>
            )}
            {visiblePayments.map((p, i) => {
              const id = p._id || p.id || String(i);
              return (
                <article key={id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold capitalize">{p.type || "Transaction"}</h2>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.method ? `${p.method} · ` : ""}Ref: {p.reference || p.orderId || "—"}
                      </p>
                    </div>
                    <StatusChip status={p.status || "pending"} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fmt(p.createdAt)}</span>
                    <span className="font-display text-sm font-bold text-primary">
                      {(p.txAmount ?? p.amount ?? 0)} SQ
                    </span>
                  </div>
                  {(p.reference || p.orderId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate(`/receipt/${p.reference || p.orderId}`)}
                    >
                      <ReceiptIcon className="mr-1.5 h-3.5 w-3.5" /> View receipt
                    </Button>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
