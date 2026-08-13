import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Search, TrendingUp, Send, ListOrdered, Loader2 } from "lucide-react";
import { AppShell, Surface } from "@/components/AppShell";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import {
  getSmmServices,
  getSmmCategories,
  placeSmmOrder,
  type SmmServiceRow,
} from "@/lib/api";

/** Social Media Boosting — browse live SQ prices and order followers, likes, views. */
export function SmmBoost() {
  const { showToast } = useToast();
  const { refreshUser } = useAuth() as unknown as { refreshUser?: () => void };
  const navigate = useNavigate();

  const [services, setServices] = useState<SmmServiceRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<SmmServiceRow | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState(1000);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getSmmServices({ q: query, category })
      .then((rows) => alive && setServices(rows))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, category]);

  useEffect(() => {
    getSmmCategories().then(setCategories).catch(() => {});
  }, []);

  const cost = useMemo(() => {
    if (!selected) return 0;
    return Math.max(1, Math.ceil((selected.pricePer1000Sq * quantity) / 1000));
  }, [selected, quantity]);

  async function submit() {
    if (!selected) return;
    if (!/^https?:\/\//i.test(link)) {
      showToast("Paste the full public link, starting with https://", "error");
      return;
    }
    if (quantity < selected.min || quantity > selected.max) {
      showToast(`Quantity must be between ${selected.min} and ${selected.max}`, "error");
      return;
    }
    setPlacing(true);
    try {
      const res = await placeSmmOrder({
        serviceId: selected.serviceId,
        provider: selected.provider,
        link,
        quantity,
      });
      showToast(`Order placed · ${res.charged} SQ charged · balance ${res.balance} SQ`, "success");
      refreshUser?.();
      setSelected(null);
      setLink("");
      navigate("/smm/orders");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not place the order", "error");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <AppShell
      title="Social Media Boosting"
      subtitle="Followers, likes, views and subscribers — priced in SQ"
      actions={
        <button
          onClick={() => navigate("/smm/orders")}
          className="p-2 rounded-full text-pink-400 hover:bg-pink-500/10 active:scale-95 transition"
          aria-label="My SMM orders"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
      }
    >
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Instagram, TikTok, YouTube…"
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#14141d] border border-white/5 text-sm outline-none focus:border-pink-500/40"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        {["", ...categories].map((c) => (
          <button
            key={c || "all"}
            onClick={() => setCategory(c)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
              category === c
                ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                : "bg-[#14141d] border-white/5 text-gray-400"
            }`}
          >
            {c || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-pink-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-gray-400">
          No services match that search yet.
        </Surface>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <Surface key={s._id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-pink-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{s.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {s.category} · min {s.min} · max {s.max}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-pink-400">{s.pricePer1000Sq} SQ</p>
                  <p className="text-[10px] text-gray-500">per 1000</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelected(s);
                  setQuantity(s.min);
                }}
                className="mt-3 w-full py-2.5 rounded-xl bg-pink-500/15 border border-pink-500/25 text-pink-300 text-xs font-bold active:scale-[0.98] transition"
              >
                Order now
              </button>
            </Surface>
          ))}
        </div>
      )}

      {/* Order sheet */}
      {selected && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-3xl bg-[#14141d] border-t border-pink-500/20 p-5 space-y-4">
            <div className="mx-auto w-10 h-1 rounded-full bg-white/15" />
            <div>
              <p className="text-sm font-semibold">{selected.name}</p>
              <p className="text-[11px] text-gray-500">
                {selected.pricePer1000Sq} SQ per 1000 · provider {selected.provider}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Public link</label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://instagram.com/your_handle"
                className="mt-1 w-full px-3 py-3 rounded-xl bg-[#0f0f16] border border-white/5 text-sm outline-none focus:border-pink-500/40"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">
                Quantity ({selected.min} – {selected.max})
              </label>
              <input
                type="number"
                value={quantity}
                min={selected.min}
                max={selected.max}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1 w-full px-3 py-3 rounded-xl bg-[#0f0f16] border border-white/5 text-sm outline-none focus:border-pink-500/40"
              />
            </div>
            <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <span className="text-xs text-gray-300">Total</span>
              <span className="text-sm font-bold text-pink-400">{cost} SQ</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-sm font-semibold active:scale-[0.98] transition"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={placing}
                className="flex-1 py-3 rounded-xl bg-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
              >
                {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Pay {cost} SQ
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default SmmBoost;
