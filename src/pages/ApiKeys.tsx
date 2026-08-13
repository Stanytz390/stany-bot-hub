import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Copy, Check, Eye, EyeOff, KeyRound, Loader2, Plus, RefreshCw, Trash2, Power, Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  createApiKey, deleteApiKey, getApiKeys, getApiUsage, regenerateApiKey, revealApiKey, setApiKeyActive,
  type ApiKeySummary, type ApiUsageRow,
} from "@/lib/api";

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/me", cost: 1, desc: "Your profile, username and live SQ balance." },
  { method: "GET", path: "/api/v1/balance", cost: 1, desc: "SQ balance only — cheapest health check." },
  { method: "GET", path: "/api/v1/bots", cost: 1, desc: "All bots on your account with status and expiry." },
  { method: "GET", path: "/api/v1/bots/:id", cost: 1, desc: "One bot, including its live dyno status." },
  { method: "GET", path: "/api/v1/bots/:id/logs", cost: 2, desc: "Latest runtime logs for a bot." },
  { method: "POST", path: "/api/v1/bots/:id/restart", cost: 3, desc: "Restart a bot instantly." },
  { method: "GET", path: "/api/v1/templates", cost: 0, desc: "Every bot you can deploy, with its SQ price. Free." },
  { method: "POST", path: "/api/v1/deploy", cost: 3, desc: "Deploy a bot. Body: template_id, app_name, session, months." },
  { method: "GET", path: "/api/v1/panels/plans", cost: 0, desc: "Panel server plans with RAM, disk, CPU and SQ price. Free." },
  { method: "GET", path: "/api/v1/panels", cost: 1, desc: "Panel servers you already own." },
  { method: "POST", path: "/api/v1/panels/order", cost: 3, desc: "Buy a panel. Body: plan_id. Credentials come back once." },
  { method: "GET", path: "/api/v1/websites", cost: 1, desc: "Hosted websites, custom domains and DNS status." },
  { method: "GET", path: "/api/v1/linkbots", cost: 1, desc: "Your linked WhatsApp bots and their protection settings." },
  { method: "GET", path: "/api/v1/services", cost: 0, desc: "Social boosting catalogue. Query: q, category, platform. Free." },
  { method: "POST", path: "/api/v1/services/order", cost: 2, desc: "Order boosting. Body: service_id, link, quantity." },
  { method: "GET", path: "/api/v1/services/order/:id", cost: 0, desc: "Poll one boosting order until it completes. Free." },
];

const SERVICE_PARAMS = [
  { name: "service_id", type: "number", required: true, desc: "Service ID from GET /v1/services." },
  { name: "link", type: "string", required: true, desc: "Public URL of the profile, post or video." },
  { name: "quantity", type: "number", required: true, desc: "Must sit between the service min and max." },
  { name: "provider", type: "string", required: false, desc: "Only needed when the same ID exists on two providers." },
];

const SERVICE_FIELDS = [
  { name: "order_id", desc: "STANY order ID — use it with GET /v1/services/order/:id." },
  { name: "status", desc: "pending, processing, completed, partial, failed, refunded or canceled." },
  { name: "start_count", desc: "Follower or view count recorded when the order started." },
  { name: "remains", desc: "How much of the quantity is still being delivered." },
  { name: "charged_sq", desc: "SQ deducted for this call, including the API fee." },
  { name: "balance_after", desc: "Your SQ balance immediately after the call." },
];

const ERROR_CODES = [
  { code: "400", desc: "Missing or invalid parameters — check service_id, link and quantity." },
  { code: "401", desc: "Missing, malformed or unknown API key." },
  { code: "402", desc: "Not enough SQ. Top up and the key works again instantly." },
  { code: "403", desc: "Key disabled or account suspended." },
  { code: "404", desc: "Service, template, plan or order not found." },
  { code: "422", desc: "Quantity outside the service min/max range." },
  { code: "429", desc: "Too many calls in a short window — slow down and retry." },
  { code: "502", desc: "Upstream provider or Heroku refused. Any SQ charged is refunded automatically." },
];

export function ApiKeys() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [usage, setUsage] = useState<ApiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const origin = window.location.origin;

  const load = useCallback(async () => {
    const [k, u] = await Promise.all([getApiKeys(), getApiUsage()]);
    setKeys(k);
    setUsage(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    load();
  }, [user, navigate, load]);

  function copy(value: string, id: string) {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(""), 1600);
  }

  async function onCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await createApiKey(name.trim() || undefined);
      if (res?.error) { setError(res.error); return; }
      setName("");
      if (res?.key && res?._id) setRevealed((r) => ({ ...r, [res._id]: res.key }));
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function onReveal(id: string) {
    if (revealed[id]) { setRevealed(({ [id]: _drop, ...rest }) => rest); return; }
    try {
      const key = await revealApiKey(id);
      setRevealed((r) => ({ ...r, [id]: key }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reveal key");
    }
  }

  async function onRegenerate(id: string) {
    if (!window.confirm("Regenerate this key? The current value stops working immediately.")) return;
    try {
      const key = await regenerateApiKey(id);
      setRevealed((r) => ({ ...r, [id]: key }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not regenerate key");
    }
  }

  async function onToggle(k: ApiKeySummary) {
    await setApiKeyActive(k._id, !k.active);
    await load();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this API key permanently?")) return;
    await deleteApiKey(id);
    await load();
  }

  const curl = `curl -H "x-api-key: STANY-xxxxxxxxxxxx" \\\n  ${origin}/api/v1/me`;

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/25 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <header className="rounded-3xl border border-primary/20 bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-primary/15 p-3 text-primary"><KeyRound className="h-5 w-5" /></span>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Developer API keys</h1>
              <p className="text-sm text-muted-foreground">
                Automate Stany Hosting from your own apps. Every call is metered in SQ and stops working when your balance runs out.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">Balance: <b className="text-primary">{user?.txCoins ?? 0} SQ</b></span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">Keys: <b className="text-foreground">{keys.length}/5</b></span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">Prefix: <b className="text-foreground">STANY-</b></span>
          </div>
        </header>

        {error && <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

        <section className="rounded-3xl border border-primary/20 bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Create a key</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Key name (e.g. My bot dashboard)"
              className="flex-1 rounded-xl border border-primary/20 bg-input px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60"
            />
            <button
              onClick={onCreate}
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Generate key
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Your keys</h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : keys.length === 0 ? (
            <p className="rounded-2xl border border-primary/15 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No API keys yet. Generate your first key above.
            </p>
          ) : (
            keys.map((k) => (
              <div key={k._id} className="rounded-2xl border border-primary/20 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{k.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.callCount} calls · {k.sqSpent} SQ spent · {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleString()}` : "never used"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${k.active ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                    {k.active ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                  <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs text-foreground">{revealed[k._id] || k.masked}</code>
                  <button onClick={() => onReveal(k._id)} aria-label="Reveal key" className="text-muted-foreground hover:text-primary">
                    {revealed[k._id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => copy(revealed[k._id] || "", k._id)} disabled={!revealed[k._id]} aria-label="Copy key" className="text-muted-foreground hover:text-primary disabled:opacity-40">
                    {copied === k._id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => onRegenerate(k._id)} className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/60">
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </button>
                  <button onClick={() => onToggle(k)} className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/60">
                    <Power className="h-3.5 w-3.5" /> {k.active ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => onDelete(k._id)} className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:border-destructive/60">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="rounded-3xl border border-primary/20 bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Documentation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send your key in the <code className="text-primary">x-api-key</code> header (or as a Bearer token). Each response returns
            <code className="mx-1 text-primary">X-SQ-Charged</code> and <code className="text-primary">X-SQ-Balance</code>.
          </p>

          <pre className="mt-3 overflow-x-auto rounded-xl bg-secondary p-4 text-xs text-foreground">{curl}</pre>
          <button onClick={() => copy(curl, "curl")} className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary">
            {copied === "curl" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy example
          </button>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3">Method</th>
                  <th className="pb-2 pr-3">Endpoint</th>
                  <th className="pb-2 pr-3">Cost</th>
                  <th className="pb-2">What it does</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((e) => (
                  <tr key={e.path} className="border-t border-primary/10">
                    <td className="py-2 pr-3 font-mono text-xs text-primary">{e.method}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-foreground">{e.path}</td>
                    <td className="py-2 pr-3 text-xs text-foreground">{e.cost} SQ</td>
                    <td className="py-2 text-xs text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          {/* ===== SOCIAL BOOSTING DEEP DIVE ===== */}
          <div className="mt-8 rounded-2xl border border-primary/15 bg-secondary/40 p-5">
            <h3 className="text-sm font-bold text-foreground">Social boosting endpoints</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Browse the catalogue for free, order with SQ, then poll the order until it completes.
            </p>

            <pre className="mt-3 overflow-x-auto rounded-xl bg-card p-4 text-[11px] text-foreground">{`curl -H "x-api-key: STANY-xxxxxxxxxxxx" \\
  "${origin}/api/v1/services?q=instagram&category=Followers"

curl -X POST -H "x-api-key: STANY-xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"service_id":1234,"link":"https://instagram.com/handle","quantity":1000}' \\
  ${origin}/api/v1/services/order`}</pre>

            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Order parameters</h4>
            <div className="mt-2 space-y-1.5">
              {SERVICE_PARAMS.map((p) => (
                <div key={p.name} className="rounded-xl bg-card px-3 py-2 text-xs">
                  <span className="font-mono text-primary">{p.name}</span>
                  <span className="ml-2 text-muted-foreground">{p.type}{p.required ? " · required" : " · optional"}</span>
                  <p className="mt-0.5 text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>

            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Response fields</h4>
            <div className="mt-2 space-y-1.5">
              {SERVICE_FIELDS.map((f) => (
                <div key={f.name} className="rounded-xl bg-card px-3 py-2 text-xs">
                  <span className="font-mono text-primary">{f.name}</span>
                  <p className="mt-0.5 text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>

            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Error codes</h4>
            <div className="mt-2 space-y-1.5">
              {ERROR_CODES.map((e) => (
                <div key={e.code} className="flex gap-3 rounded-xl bg-card px-3 py-2 text-xs">
                  <span className="font-mono font-bold text-primary">{e.code}</span>
                  <span className="text-muted-foreground">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="mt-5 space-y-1.5 text-xs text-muted-foreground">
            <li>· <b className="text-foreground">401</b> — missing, malformed or unknown key.</li>
            <li>· <b className="text-foreground">403</b> — key disabled or account suspended.</li>
            <li>· <b className="text-foreground">402</b> — not enough SQ; top up and the key works again instantly.</li>
            <li>· Keys are charged before the request runs, and every call is listed below.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Activity className="h-4 w-4 text-primary" /> Recent usage</h2>
          {usage.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No API calls yet.</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {usage.map((u, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs">
                  <span className="font-mono text-foreground">{u.endpoint}</span>
                  <span className="text-muted-foreground">{u.cost} SQ · {new Date(u.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
