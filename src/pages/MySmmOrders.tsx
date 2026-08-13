import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Link2, Loader2 } from "lucide-react";
import { AppShell, Surface } from "@/components/AppShell";
import { getSmmOrders, type SmmOrderRow } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  processing: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  partial: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  failed: "bg-red-500/15 text-red-300 border-red-500/25",
  refunded: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  canceled: "bg-gray-500/15 text-gray-300 border-gray-500/25",
};

const LIVE = new Set(["pending", "processing"]);

/** Order history with automatic polling while any order is still running. */
export function MySmmOrders() {
  const [orders, setOrders] = useState<SmmOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      setOrders(await getSmmOrders());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll every 15s while at least one order is pending/processing.
  useEffect(() => {
    if (!orders.some((o) => LIVE.has(o.status))) return;
    timer.current = setTimeout(() => load(true), 15000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [orders, load]);

  return (
    <AppShell
      title="My SMM Orders"
      subtitle="Live status, SQ charged and balance after each order"
      actions={
        <button
          onClick={() => load()}
          className="p-2 rounded-full text-pink-400 hover:bg-pink-500/10 active:scale-95 transition"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      }
    >
      {loading ? (
        <div className="py-16 flex justify-center text-pink-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-gray-400">
          You haven't ordered any boosting yet.
        </Surface>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Surface key={o._id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug truncate">{o.serviceName}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {new Date(o.createdAt).toLocaleString()} · qty {o.quantity}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    STATUS_STYLE[o.status] || STATUS_STYLE.pending
                  }`}
                >
                  {o.status}
                </span>
              </div>

              <a
                href={o.link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 text-[11px] text-pink-400 truncate"
              >
                <Link2 className="w-3 h-3 shrink-0" />
                {o.link}
              </a>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#0f0f16] py-2">
                  <p className="text-[10px] text-gray-500">Charged</p>
                  <p className="text-xs font-bold text-pink-400">{o.priceSq} SQ</p>
                </div>
                <div className="rounded-xl bg-[#0f0f16] py-2">
                  <p className="text-[10px] text-gray-500">Start count</p>
                  <p className="text-xs font-bold">{o.startCount ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-[#0f0f16] py-2">
                  <p className="text-[10px] text-gray-500">Remains</p>
                  <p className="text-xs font-bold">{o.remains ?? "—"}</p>
                </div>
              </div>

              {o.note && <p className="mt-2 text-[11px] text-gray-500">{o.note}</p>}
            </Surface>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default MySmmOrders;
