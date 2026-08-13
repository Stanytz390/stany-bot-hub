import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Github, Loader2, Rocket, Search, ShieldAlert } from "lucide-react";
import { inspectRepo, deployManualRepo, type RepoInspection } from "@/lib/api";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { Seo } from "@/components/Seo";

/** Deploy any public GitHub bot repository the user owns. */
export function DeployRepo() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, refresh } = useAuth() as unknown as { user: { txCoins: number } | null; refresh?: () => void };
  const { settings } = useAppSettings();

  const [repoUrl, setRepoUrl] = useState("");
  const [meta, setMeta] = useState<RepoInspection | null>(null);
  const [appName, setAppName] = useState("");
  const [sessionVar, setSessionVar] = useState("");
  const [months, setMonths] = useState(1);
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    if (meta && !appName) setAppName(`${meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 18)}-${Math.floor(1000 + Math.random() * 9000)}`);
  }, [meta, appName]);

  const costPerMonth = meta?.costTx ?? settings.manualDeployCostTx ?? 20;
  const total = costPerMonth * months;

  const check = async () => {
    setChecking(true);
    setMeta(null);
    try {
      const data = await inspectRepo(repoUrl.trim());
      setMeta(data);
      const initial: Record<string, string> = {};
      for (const v of data.vars) initial[v.key] = v.value || "";
      setExtraVars(initial);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not read that repository", "error");
    }
    setChecking(false);
  };

  const deploy = async () => {
    if (!meta) return;
    setDeploying(true);
    try {
      await deployManualRepo({ repoUrl: repoUrl.trim(), appName, sessionVar, months, extraVars });
      showToast("Deployment started — check My Bots for progress", "success");
      refresh?.();
      navigate("/mybots");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Deployment failed", "error");
    }
    setDeploying(false);
  };

  if (settings.manualDeployEnabled === false) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Custom repository deployment is paused</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again later or deploy one of our ready-made bots.</p>
      </main>
    );
  }

  return (
    <>
      <Seo
        title="Deploy your own GitHub bot | Stany Hosting"
        description="Paste your public GitHub repository and Stany Hosting fetches its app.json config and deploys it in seconds."
      />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Github className="h-6 w-6 text-primary" /> Deploy your own repo
          </h1>
          <p className="text-sm text-muted-foreground">
            {costPerMonth} SQ per month. We read your repository&apos;s <code>app.json</code> and deploy it automatically.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="repo" className="mb-2 block text-sm font-medium text-foreground">GitHub repository URL</label>
          <div className="flex gap-2">
            <input
              id="repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/my-bot"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              onClick={check}
              disabled={!repoUrl.trim() || checking}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-45"
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Check
            </button>
          </div>
        </section>

        {meta && (
          <section className="space-y-4 rounded-2xl border border-primary/20 bg-card p-5">
            <div className="flex items-center gap-3">
              {meta.imageUrl && <img src={meta.imageUrl} alt={meta.name} className="h-12 w-12 rounded-xl object-cover" loading="lazy" />}
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{meta.name}</p>
                <p className="truncate text-xs text-muted-foreground">{meta.description || meta.repoKey}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="appName" className="mb-1 block text-xs font-medium text-muted-foreground">App name</label>
                <input id="appName" value={appName} onChange={(e) => setAppName(e.target.value.toLowerCase())}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="months" className="mb-1 block text-xs font-medium text-muted-foreground">Months</label>
                <select id="months" value={months} onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                  {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="session" className="mb-1 block text-xs font-medium text-muted-foreground">Session ID</label>
              <input id="session" value={sessionVar} onChange={(e) => setSessionVar(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>

            {meta.vars.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Config from app.json</p>
                {meta.vars.map((v) => (
                  <div key={v.key}>
                    <label htmlFor={`v-${v.key}`} className="mb-1 block text-xs text-muted-foreground">
                      {v.key}{v.required && <span className="text-destructive"> *</span>}
                    </label>
                    <input
                      id={`v-${v.key}`}
                      value={extraVars[v.key] ?? ""}
                      placeholder={v.description}
                      onChange={(e) => setExtraVars((s) => ({ ...s, [v.key]: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">{total} SQ</span>
            </div>

            <button
              onClick={deploy}
              disabled={deploying || !appName || !sessionVar || (user ? user.txCoins < total : false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-45"
            >
              {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Deploy for {total} SQ
            </button>
            {user && user.txCoins < total && (
              <p className="text-center text-xs text-destructive">You need {total - user.txCoins} more SQ.</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
