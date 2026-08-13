import { type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  LayoutDashboard,
  Rocket,
  TrendingUp,
  Globe,
  Bot as BotIcon,
  Coins,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Android-style app chrome: a compact material top app bar plus a bottom
 * navigation rail. No gold/amber anywhere — the palette stays dark + pink.
 */
const BOTTOM_NAV = [
  { label: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Boost", icon: TrendingUp, path: "/smm" },
  { label: "Deploy", icon: Rocket, path: "/services/bots" },
  { label: "Link Bot", icon: BotIcon, path: "/linkbot" },
  { label: "Sites", icon: Globe, path: "/hosting" },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ===== TOP APP BAR ===== */}
      <header className="sticky top-0 z-40 bg-[#0f0f16]/95 backdrop-blur-xl border-b border-pink-500/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full text-pink-400 hover:bg-pink-500/10 active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
          </div>
          {actions}
          <button
            onClick={() => navigate("/topup")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/25 text-pink-300 text-xs font-bold active:scale-95 transition"
          >
            <Coins className="w-3.5 h-3.5" />
            {user?.txCoins ?? 0} SQ
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 pb-28">{children}</main>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0f0f16]/95 backdrop-blur-xl border-t border-pink-500/10">
        <div className="max-w-5xl mx-auto grid grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="py-2.5 flex flex-col items-center gap-1 active:scale-95 transition"
              >
                <span
                  className={`px-4 py-1 rounded-full transition-colors ${
                    active ? "bg-pink-500/20 text-pink-400" : "text-gray-500"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </span>
                <span className={`text-[10px] font-medium ${active ? "text-pink-400" : "text-gray-500"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Material-ish surface card used across the new pages. */
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-[#14141d] border border-white/5 shadow-lg shadow-black/30 ${className}`}>
      {children}
    </div>
  );
}
