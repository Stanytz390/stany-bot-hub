import { type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  LayoutDashboard,
  Gamepad2,
  Film,
  Coins,
  Home,
} from "lucide-react";
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

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col selection:bg-[#1ed760]/30 selection:text-[#1ed760] overflow-x-hidden">
      {/* Top Universal Navbar */}
      {showNavbar && <AppNavbar />}

      {/* Sub-Header / Page Header if title is provided */}
      {title && (
        <div className="bg-[#181818] border-b border-[#282828]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="p-1.5 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white truncate">{title}</h1>
                {subtitle && <p className="text-[11px] text-zinc-400 truncate">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-6 pb-28 md:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation Rail (Spotify UI style) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-t border-[#282828]">
        <div className="max-w-md mx-auto grid grid-cols-5 px-1 py-1">
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
                className="py-1.5 flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform"
              >
                <span
                  className={`p-1 rounded-full transition-colors ${
                    active ? "text-[#1ed760]" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span
                  className={`text-[10px] font-medium leading-none ${
                    active ? "text-white font-bold" : "text-zinc-500"
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
