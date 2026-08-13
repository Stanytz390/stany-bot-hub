import { useEffect, useState } from "react";
import { Ticket, Plus, Trash2, Power, Loader2, Percent } from "lucide-react";
import {
  adminGetPromos,
  adminCreatePromo,
  adminUpdatePromo,
  adminDeletePromo,
  type AdminPromo
} from "@/lib/api";
import { useToast } from "@/hooks/useToast";

export function AdminPromos() {
  const { showToast } = useToast();
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [scope, setScope] = useState<"all" | "topup" | "purchase">("all");
  const [maxUses, setMaxUses] = useState("0");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [minAmount, setMinAmount] = useState("0");
  const [expiresAt, setExpiresAt] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetPromos();
      setPromos(Array.isArray(data) ? data : []);
    } catch {
      setPromos([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!code.trim() || !Number(percent)) {
      showToast("Enter a code and discount percent", "error");
      return;
    }
    setSaving(true);
    const res = await adminCreatePromo({
      code: code.trim(),
      discountPercent: Number(percent),
      scope,
      maxUses: Number(maxUses) || 0,
      perUserLimit: Number(perUserLimit) || 0,
      minAmount: Number(minAmount) || 0,
      expiresAt: expiresAt || null
    });
    setSaving(false);
    if (res?.error) { showToast(res.error, "error"); return; }
    showToast(`Promo ${code.toUpperCase()} created`, "success");
    setCode("");
    setExpiresAt("");
    load();
  };

  const toggle = async (p: AdminPromo) => {
    await adminUpdatePromo(p._id, { active: !p.active });
    load();
  };

  const remove = async (p: AdminPromo) => {
    await adminDeletePromo(p._id);
    showToast(`Deleted ${p.code}`, "success");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Promo codes (discounts)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="CODE e.g. STANY20"
            className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          <div className="relative">
            <input
              value={percent}
              onChange={e => setPercent(e.target.value.replace(/\D/g, ""))}
              placeholder="Discount %"
              className="glass-input w-full rounded-xl px-3 py-2.5 pr-9 text-sm outline-none focus:border-primary/50"
            />
            <Percent className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <select
            value={scope}
            onChange={e => setScope(e.target.value as typeof scope)}
            className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          >
            <option value="all">All purchases</option>
            <option value="topup">Top-up only</option>
            <option value="purchase">Panels / bots only</option>
          </select>
          <input
            value={maxUses}
            onChange={e => setMaxUses(e.target.value.replace(/\D/g, ""))}
            placeholder="Max uses (0 = unlimited)"
            className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          <input
            value={perUserLimit}
            onChange={e => setPerUserLimit(e.target.value.replace(/\D/g, ""))}
            placeholder="Per user limit"
            className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          <input
            value={minAmount}
            onChange={e => setMinAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="Min amount (TZS topup / SQ purchase)"
            className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="glass-input rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
        </div>

        <button
          onClick={create}
          disabled={saving}
          className="btn-pink mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create promo code
        </button>
      </div>

      <div className="glass-card p-4 sm:p-5">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : promos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No promo codes yet.</p>
        ) : (
          <div className="space-y-2">
            {promos.map(p => (
              <div key={p._id} className="glass-bubble flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{p.code}</span>
                    <span className="chip-premium">{p.discountPercent}% off</span>
                    <span className="text-[11px] text-muted-foreground uppercase">{p.scope}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used {p.usedCount}{p.maxUses > 0 ? ` / ${p.maxUses}` : ""} · per user {p.perUserLimit || "∞"}
                    {p.minAmount ? ` · min ${p.minAmount}` : ""}
                    {p.expiresAt ? ` · expires ${new Date(p.expiresAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(p)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      p.active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {p.active ? "Active" : "Disabled"}
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
