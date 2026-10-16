import { type ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import {
  ArrowLeft,
  LayoutDashboard,
  Gamepad2,
  Film,
  Coins,
  Home,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppNavbar } from "./AppNavbar";

const BOTTOM_NAV = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Games", icon: Gamepad2, path: "/games" },
  { label: "Movies", icon: Film, path: "/movies" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Wallet", icon: Coins, path: "/topup" },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
  showNavbar = true,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  showNavbar?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Universal Navbar */}
      {showNavbar && <AppNavbar />}

      {/* Sub-Header / Page Header if title is provided */}
      {title && (
        <div className="bg-[#0b0e15] border-b border-border/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="p-1.5 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-white truncate">{title}</h1>
                {subtitle && <p className="text-[11px] text-zinc-400 truncate">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation Rail */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#090b10]/95 backdrop-blur-xl border-t border-border/80">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const active =
              item.path === "/"
                ? pathname === "/"
                : pathname === item.path || pathname.startsWith(item.path + "/");
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="py-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition"
              >
                <span
                  className={`p-1.5 rounded-xl transition-colors ${
                    active ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span
                  className={`text-[10px] font-medium leading-none ${
                    active ? "text-emerald-400 font-semibold" : "text-zinc-500"
                  }`}
                >
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

/** Polished surface container matching the emerald dark design system */
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-[#0d1017] border border-border/80 shadow-xl shadow-black/40 ${className}`}
    >
      {children}
    </div>
  );
}
