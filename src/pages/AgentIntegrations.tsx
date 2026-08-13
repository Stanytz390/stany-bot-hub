import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Copy, Check, Plug, ShieldCheck, Terminal, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createMcpToken } from "@/lib/api";

const TOOLS = [
  { name: "get_profile", desc: "Username, email, SQ balance, role and verification status." },
  { name: "list_my_bots", desc: "Your deployed bots with status, template and expiry." },
  { name: "list_my_transactions", desc: "SQ coin history: top-ups, deploys, transfers, refunds." },
  { name: "list_bot_templates", desc: "Bot templates available to deploy and their SQ cost." },
  { name: "list_community_messages", desc: "Latest visible messages from the community chat." },
];

export function AgentIntegrations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const endpoint = `${window.location.origin}/api/mcp`;

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  async function generate() {
    setLoading(true);
    try {
      const res = await createMcpToken();
      if (res?.token) setToken(res.token);
    } finally {
      setLoading(false);
    }
  }

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 1600);
  }

  const config = JSON.stringify(
    {
      mcpServers: {
        "coinshare-hub": {
          type: "http",
          url: endpoint,
          headers: { Authorization: `Bearer ${token || "<YOUR_MCP_TOKEN>"}` },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground">
            <Plug className="h-3.5 w-3.5" /> Agent integrations (MCP)
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connect AI assistants to your account</h1>
          <p className="text-sm text-muted-foreground">
            Use ChatGPT, Claude, Cursor or any MCP client to read your SQ balance, bots, transactions and community feed.
            Tools are read-only — coin transfers and deployments stay inside the app.
          </p>
        </header>

        <section className="glass-card space-y-3 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Terminal className="h-4 w-4 text-primary" /> Server endpoint
          </h2>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background p-3">
            <code className="flex-1 break-all text-xs">{endpoint}</code>
            <button onClick={() => copy(endpoint, "url")} className="rounded-lg p-2 hover:bg-muted" aria-label="Copy endpoint">
              {copied === "url" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Personal access token
          </h2>
          <p className="text-sm text-muted-foreground">
            The token acts as you and is valid for 90 days. Keep it secret — anyone with it can read your account data.
          </p>
          {token ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background p-3">
              <code className="flex-1 break-all text-xs">{token}</code>
              <button onClick={() => copy(token, "token")} className="rounded-lg p-2 hover:bg-muted" aria-label="Copy token">
                {copied === "token" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ) : null}
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            {token ? "Generate a new token" : "Generate token"}
          </button>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Client configuration</h2>
          <pre className="overflow-x-auto rounded-xl border border-border/60 bg-background p-4 text-xs">{config}</pre>
          <button
            onClick={() => copy(config, "config")}
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            {copied === "config" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />} Copy config
          </button>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Available tools</h2>
          <ul className="space-y-2">
            {TOOLS.map((t) => (
              <li key={t.name} className="rounded-xl border border-border/60 bg-background p-3">
                <p className="font-mono text-sm text-primary">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default AgentIntegrations;
