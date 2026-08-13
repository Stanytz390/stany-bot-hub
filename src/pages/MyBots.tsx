import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getBots } from "@/lib/api";
import type { Bot as BotType } from "@/types";
import { BotCard } from "@/components/BotCard";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft, Coins, Loader2, Bot, Plus,
  LayoutDashboard, CreditCard, BookOpen, UserCircle, LogOut,
  ChevronRight, Moon, Sun, Menu, X, Shield,
  Sparkles, Heart, Rocket
} from "lucide-react";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

// ===== ANIMATED LOGO PINK =====
function AnimatedLogo() {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-500" />
      <img
        src="https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg"
        alt="STANY Host"
        className="relative w-9 h-9 rounded-xl object-cover ring-2 ring-pink-400/50 shadow-lg shadow-pink-500/20"
      />
      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-400 rounded-full animate-pulse ring-2 ring-[#0a0a0f]" />
    </div>
  );
}

// ===== PINK BUTTON =====
function PinkButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={`
        relative overflow-hidden bg-gradient-to-r from-pink-500 to-pink-600 
        hover:from-pink-400 hover:to-pink-500 text-white font-semibold 
        shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 
        transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97]
        rounded-xl border border-pink-400/20 px-5 py-2.5
        ${className || ""}
      `}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    </Button>
  );
}

export function MyBots() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [botSearch, setBotSearch] = useState("");
  const [deployingAppName, setDeployingAppName] = useState<string | null>(null);
  const deployTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (navOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [navOpen]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("deployingBot");
      if (stored) {
        const parsed = JSON.parse(stored) as { appName: string; startTime: number };
        const elapsed = Date.now() - parsed.startTime;
        const remaining = 240000 - elapsed;
        if (remaining > 0) {
          setDeployingAppName(parsed.appName);
          deployTimerRef.current = setTimeout(() => {
            setDeployingAppName(null);
            localStorage.removeItem("deployingBot");
          }, remaining);
        } else {
          localStorage.removeItem("deployingBot");
        }
      }
    } catch {
      localStorage.removeItem("deployingBot");
    }
  }, []);

  useEffect(() => {
    return () => { if (deployTimerRef.current) clearTimeout(deployTimerRef.current); };
  }, []);

  const fetchBots = useCallback(async () => {
    try {
      const data = await getBots();
      if (Array.isArray(data)) setBots(data);
    } catch { showToast("Failed to load bots", "error"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { if (user) fetchBots(); }, [user, fetchBots]);

  if (authLoading) return <PageLoader />;
  if (!user) return <PageLoader />;

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Top Up SQ", icon: CreditCard, path: "/topup" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <TechBackground />

      {/* ===== ANIMATED PARTICLES ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-pink-500/5"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float-particle ${Math.random() * 12 + 10}s linear infinite`,
              animationDelay: Math.random() * 12 + 's',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,142,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0px) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
          }
          @keyframes slide-up {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up {
            animation: slide-up 0.5s ease-out forwards;
          }
        `}</style>
      </div>

      {/* ===== NAVBAR PINK ===== */}
      <nav className="border-b border-pink-500/10 sticky top-0 bg-[#0a0a0f]/80 z-50 shadow-lg shadow-pink-500/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                className="p-2.5 -ml-2 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400 hover:text-pink-300"
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <AnimatedLogo />
                <span className="font-bold text-xl text-white tracking-tight">STANY</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/20">
                  v2.0
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl hover:bg-pink-500/10 transition-all duration-300 text-pink-400 hover:text-pink-300 hover:rotate-12"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => navigateWithLoader("/profile")}
                className="p-2.5 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400 hover:text-pink-300 relative"
                aria-label="Profile"
              >
                <UserCircle className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-[#0a0a0f]" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== SIDENAV PINK ===== */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-[100]"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-[#0a0a0f] border-r border-pink-500/10 z-[110] transform transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-pink-500/10">
          <div className="flex items-center gap-3">
            <AnimatedLogo />
            <span className="font-bold text-lg text-white">STANY</span>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            className="p-2.5 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400 hover:text-pink-300"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col h-[calc(100%-73px)] overflow-y-auto">
          {user && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 shadow-inner shadow-pink-500/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                  {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.username ? `@${user.username}` : user.email}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/10">
                <Coins className="w-5 h-5 text-pink-400" />
                <span className="text-sm font-bold text-pink-400">{user.txCoins} SQ</span>
                <span className="ml-auto text-xs text-pink-400/50">Balance</span>
              </div>
            </div>
          )}

          <nav className="space-y-1 flex-1">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => { navigateWithLoader(item.path); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                  {item.label}
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 transition-all" />
              </button>
            ))}

            <div className="pt-3 pb-2">
              <p className="px-4 text-[10px] font-semibold text-pink-400/50 uppercase tracking-wider mb-1">Services</p>
              <button
                onClick={() => { navigateWithLoader("/services/bots"); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Bot className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                  Bot Deployment
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 transition-all" />
              </button>
              <button
                onClick={() => { navigateWithLoader("/services/panels"); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                  Panels
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 transition-all" />
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={() => { navigateWithLoader("/admin"); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            )}
          </nav>

          <div className="space-y-1 border-t border-pink-500/10 pt-4 mt-4">
            <button
              onClick={() => { navigateWithLoader("/profile"); setNavOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all group"
            >
              <UserCircle className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
              Profile Settings
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all group"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-[1]">
        {/* ===== HEADER ===== */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl border border-pink-500/20 hover:bg-pink-500/10 transition-all text-pink-400 hover:text-pink-300"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-pink-400" />
                </div>
                My Bots
              </h1>
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            </div>
            <p className="text-sm text-pink-400/70 mt-1 ml-14">Manage your deployed bots</p>
          </div>
        </div>

        {/* ===== SEARCH BAR ===== */}
        <div className="mb-6 relative">
          <input
            type="text"
            value={botSearch}
            onChange={e => setBotSearch(e.target.value)}
            placeholder="Search bots by name..."
            className="w-full px-4 py-3 pl-11 rounded-xl border border-pink-500/10 bg-[#0a0a0f]/50 text-sm text-white placeholder:text-pink-400/40 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          {botSearch && (
            <button
              onClick={() => setBotSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pink-400/50 hover:text-pink-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ===== DEPLOYING BOT ===== */}
        {deployingAppName && (
          <div className="mb-6 p-5 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-pink-600/5 flex items-center gap-4 shadow-lg shadow-pink-500/10 animate-slide-up">
            <div className="relative">
              <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-pink-300">Bot is deploying...</p>
              <p className="text-xs text-pink-400/80 mt-0.5">
                <span className="font-mono bg-pink-500/10 px-2 py-0.5 rounded-md">{deployingAppName}</span>
                {" "}is building. This takes about 2 minutes.
              </p>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-pink-400"
                  style={{
                    animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ===== BOTS LIST ===== */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-14 h-14 animate-spin text-pink-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-pink-400 animate-ping" />
                </div>
              </div>
              <p className="text-sm text-pink-400/70 animate-pulse">Loading your bots...</p>
            </div>
          </div>
        ) : bots.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-10 h-10 text-pink-400/40" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No bots yet</h3>
            <p className="text-sm text-pink-400/60 mb-5">Deploy your first bot to get started</p>
            <PinkButton onClick={() => navigateWithLoader("/services/bots")}>
              <Rocket className="w-4 h-4" />
              Deploy New
            </PinkButton>
          </div>
        ) : botSearch.trim() && bots.filter(b => b.herokuAppName.toLowerCase().includes(botSearch.toLowerCase())).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-pink-400/60">
              No bots match "<span className="text-pink-400 font-medium">{botSearch}</span>"
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-pink-400" />
                <h2 className="font-semibold text-lg text-white">Your Bots</h2>
                <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/20">
                  {bots.filter(b => !botSearch.trim() || b.herokuAppName.toLowerCase().includes(botSearch.toLowerCase())).length}
                </span>
              </div>
              <button
                onClick={() => navigateWithLoader("/services/bots")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-pink-500/20 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" />
                Deploy More
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bots
                .filter(b => !botSearch.trim() || b.herokuAppName.toLowerCase().includes(botSearch.toLowerCase()))
                .map(bot => (
                  <div key={bot._id} className="animate-slide-up">
                    <BotCard
                      bot={bot}
                      onUpdate={fetchBots}
                      coinBalance={user.txCoins}
                      deploying={deployingAppName === bot.herokuAppName}
                    />
                  </div>
                ))}
            </div>
          </>
        )}

        {/* ===== FOOTER ===== */}
        <div className="mt-12 pt-6 border-t border-pink-500/10 text-center">
          <p className="text-xs text-muted-foreground/50">
            Made with <Heart className="w-3 h-3 inline text-pink-400 animate-heartbeat" /> by STANY
          </p>
        </div>
      </main>

      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.2); }
          28% { transform: scale(1); }
          42% { transform: scale(1.1); }
          70% { transform: scale(1); }
        }
        .animate-heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
        }
        @keyframes typing-dot {
          0%, 100% { transform: scale(0.5); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}