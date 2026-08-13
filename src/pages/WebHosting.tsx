import { useEffect, useState } from "react";
import { Globe, Loader2, Plus, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { AppShell, Surface } from "@/components/AppShell";
import { useToast } from "@/hooks/useToast";
import {
  getMyWebsites,
  createWebsite,
  attachDomain,
  checkDomain,
  getWebsiteStatus,
  deleteWebsite,
  type WebsiteRow,
} from "@/lib/api";

const DOMAIN_STATUS: Record<string, string> = {
  none: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  pending: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  failed: "bg-red-500/15 text-red-300 border-red-500/25",
};

/** Host a website on Heroku and point a custom domain at it. */
export function WebHosting() {
  const { showToast } = useToast();
  const [sites, setSites] = useState<WebsiteRow[]>([]);
  const [pricing, setPricing] = useState({ websiteSq: 50, domainSq: 20 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ appName: "", sourceUrl: "" });
  const [domainInput, setDomainInput] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await getMyWebsites();
      setSites(res.sites);
      setPricing(res.pricing);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deploy() {
    if (!/^[a-z0-9-]{3,30}$/.test(form.appName)) {
      showToast("App name: 3-30 lowercase letters, numbers or dashes", "error");
      return;
    }
    if (!/^https?:\/\//i.test(form.sourceUrl)) {
      showToast("Paste a public GitHub repository URL", "error");
      return;
    }
    setBusy(true);
    try {
      await createWebsite(form);
      showToast(`Website deploying · ${pricing.websiteSq} SQ charged`, "success");
      setShowForm(false);
      setForm({ appName: "", sourceUrl: "" });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not deploy", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Website Hosting"
      subtitle={`Deploy a site for ${pricing.websiteSq} SQ · custom domain ${pricing.domainSq} SQ`}
      actions={
        <button
          onClick={load}
          className="p-2 rounded-full text-pink-400 hover:bg-pink-500/10 active:scale-95 transition"
          aria-label="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      }
    >
      <button
        onClick={() => setShowForm(true)}
        className="w-full mb-3 py-3 rounded-2xl bg-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
      >
        <Plus className="w-4 h-4" /> Deploy a website
      </button>

      {loading ? (
        <div className="py-16 flex justify-center text-pink-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : sites.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-gray-400">
          No websites hosted yet.
        </Surface>
      ) : (
        <div className="space-y-3">
          {sites.map((s) => (
            <Surface key={s._id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-pink-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{s.appName}</p>
                  <p className="text-[11px] text-gray-500">{s.status}</p>
                </div>
                <button
                  onClick={async () => {
                    const fresh = await getWebsiteStatus(s._id);
                    setSites((prev) => prev.map((x) => (x._id === s._id ? fresh : x)));
                  }}
                  className="p-2 rounded-full text-gray-400 hover:text-pink-400 transition"
                  aria-label="Check status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    await deleteWebsite(s._id);
                    showToast("Website deleted", "success");
                    load();
                  }}
                  className="p-2 rounded-full text-red-400 hover:bg-red-500/10 transition"
                  aria-label="Delete website"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {s.herokuUrl && (
                <a
                  href={s.herokuUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-pink-400 truncate"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {s.herokuUrl}
                </a>
              )}

              <div className="rounded-xl bg-[#0f0f16] border border-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Custom domain</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      DOMAIN_STATUS[s.domainStatus] || DOMAIN_STATUS.none
                    }`}
                  >
                    {s.domainStatus}
                  </span>
                </div>

                {s.customDomain ? (
                  <>
                    <p className="text-xs font-semibold">{s.customDomain}</p>
                    {s.dnsTarget && (
                      <p className="text-[11px] text-gray-500 break-all">
                        Point a CNAME record to <span className="text-pink-300">{s.dnsTarget}</span>
                      </p>
                    )}
                    <button
                      onClick={async () => {
                        const fresh = await checkDomain(s._id);
                        setSites((prev) => prev.map((x) => (x._id === s._id ? fresh : x)));
                        showToast(`Domain status: ${fresh.domainStatus}`, "info");
                      }}
                      className="w-full py-2 rounded-lg bg-pink-500/15 border border-pink-500/25 text-pink-300 text-[11px] font-bold active:scale-[0.98] transition"
                    >
                      Verify DNS
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={domainInput[s._id] || ""}
                      onChange={(e) => setDomainInput((d) => ({ ...d, [s._id]: e.target.value }))}
                      placeholder="www.yourdomain.com"
                      className="flex-1 px-3 py-2 rounded-lg bg-[#14141d] border border-white/5 text-xs outline-none focus:border-pink-500/40"
                    />
                    <button
                      onClick={async () => {
                        try {
                          const fresh = await attachDomain(s._id, domainInput[s._id] || "");
                          setSites((prev) => prev.map((x) => (x._id === s._id ? fresh : x)));
                          showToast(`Domain attached · ${pricing.domainSq} SQ charged`, "success");
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Could not attach", "error");
                        }
                      }}
                      className="px-3 rounded-lg bg-pink-500 text-white text-[11px] font-bold active:scale-95 transition"
                    >
                      {pricing.domainSq} SQ
                    </button>
                  </div>
                )}
              </div>
            </Surface>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-3xl bg-[#14141d] border-t border-pink-500/20 p-5 space-y-3">
            <div className="mx-auto w-10 h-1 rounded-full bg-white/15" />
            <p className="text-sm font-semibold">New website · {pricing.websiteSq} SQ</p>
            <div>
              <label className="text-xs text-gray-400">App name</label>
              <input
                value={form.appName}
                onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value.toLowerCase() }))}
                placeholder="my-portfolio"
                className="mt-1 w-full px-3 py-3 rounded-xl bg-[#0f0f16] border border-white/5 text-sm outline-none focus:border-pink-500/40"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">GitHub repository URL</label>
              <input
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                placeholder="https://github.com/user/repo"
                className="mt-1 w-full px-3 py-3 rounded-xl bg-[#0f0f16] border border-white/5 text-sm outline-none focus:border-pink-500/40"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-sm font-semibold active:scale-[0.98] transition"
              >
                Cancel
              </button>
              <button
                onClick={deploy}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default WebHosting;
