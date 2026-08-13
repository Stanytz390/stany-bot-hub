import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getBots, getMyPanels, getPaymentHistory } from "@/lib/api";
import type { Bot as BotType, UserPanel } from "@/types";
import { BotCard } from "@/components/BotCard";
import { NotificationBell } from "@/components/NotificationBell";
import { CopyButton } from "@/components/CopyButton";
import { CouponModal } from "@/components/CouponModal";
import { ReferralModal } from "@/components/ReferralModal";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  Gift, Users, Coins, LogOut, Shield, Clock,
  Loader2, RefreshCw, Bot, AlertTriangle, Menu, X,
  LayoutDashboard, BookOpen, UserCircle, CreditCard,
  MessageCircle, ChevronRight, Moon, Sun, Server,
  Youtube, Sparkles, Zap, Rocket, Heart, TrendingUp, Globe, ListOrdered,
  Activity, ArrowUpRight, Settings, Check
} from "lucide-react";
import { TechBackground } from "@/components/TechBackground";
import { AdBanner } from "@/components/AdBanner";
import { RewardsPanel } from "@/components/RewardsPanel";

// ===== SPLASH LOADER =====
function SplashLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0f]">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-pink-500/20 blur-3xl animate-pulse" />
        <div className="w-24 h-24 rounded-full border-4 border-pink-500/20 border-t-pink-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-pink-400 animate-ping opacity-75" />
        </div>
        <div className="absolute -inset-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-pink-400"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 45}deg) translateX(-32px) rotate(-${i * 45}deg)`,
                animation: `pulse-ring 2s ease-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
      <p className="mt-8 text-pink-300 font-bold text-2xl tracking-wider animate-pulse">
        STANY<span className="text-pink-500">.</span>
      </p>
      <div className="mt-4 flex gap-1.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-pink-400"
            style={{
              animation: `bounce-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ===== THEME =====
function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return { theme, toggle };
}

// ===== ANIMATED LOGO =====
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

// ===== QUICK ACTION CARD =====
function QuickActionCard({
  icon: Icon,
  label,
  onClick,
  color = "pink",
  delay = 0
}: {
  icon: any,
  label: string,
  onClick: () => void,
  color?: string,
  delay?: number
}) {
  const colors: Record<string, string> = {
    pink: "from-pink-500/20 to-pink-600/5 border-pink-500/30 hover:border-pink-500/50 shadow-pink-500/10 hover:shadow-pink-500/25",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50 shadow-blue-500/10 hover:shadow-blue-500/25",
    green: "from-green-500/20 to-green-600/5 border-green-500/30 hover:border-green-500/50 shadow-green-500/10 hover:shadow-green-500/25",
    purple: "from-primary/20 to-primary/5 border-primary/30 hover:border-primary/50 shadow-primary/10 hover:shadow-primary/25",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/30 hover:border-rose-500/50 shadow-rose-500/10 hover:shadow-rose-500/25",
  };

  const iconColors: Record<string, string> = {
    pink: "from-pink-500/30 to-pink-600/20 border-pink-500/30 text-pink-400",
    blue: "from-blue-500/30 to-blue-600/20 border-blue-500/30 text-blue-400",
    green: "from-green-500/30 to-green-600/20 border-green-500/30 text-green-400",
    purple: "from-primary/30 to-primary/20 border-primary/30 text-primary",
    rose: "from-rose-500/30 to-rose-600/20 border-rose-500/30 text-rose-400",
  };

  return (
    <button
      onClick={onClick}
      className={`
        group relative p-5 rounded-2xl border bg-gradient-to-br ${colors[color] || colors.pink}
        transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]
        shadow-lg hover:shadow-xl backdrop-blur-sm
        animate-slide-up
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
      
      <div className="relative flex flex-col items-center gap-3">
        <div className={`
          w-14 h-14 rounded-xl bg-gradient-to-br ${iconColors[color] || iconColors.pink}
          flex items-center justify-center group-hover:scale-110 transition-transform duration-300
          border
        `}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-sm font-semibold text-white group-hover:text-pink-300 transition-colors duration-300">
          {label}
        </span>
      </div>
    </button>
  );
}

// ===== STAT CARD =====
function StatCard({
  icon: Icon,
  label,
  value,
  action,
  actionLabel,
  color = "pink",
  gradient = false
}: {
  icon: any,
  label: string,
  value: string | number,
  action?: () => void,
  actionLabel?: string,
  color?: string,
  gradient?: boolean
}) {
  const colors: Record<string, string> = {
    pink: "from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    green: "from-green-500/20 to-green-600/5 border-green-500/20 text-green-400",
    purple: "from-primary/20 to-primary/5 border-primary/20 text-primary",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/20 text-rose-400",
  };

  const iconColors: Record<string, string> = {
    pink: "bg-pink-500/20 text-pink-400",
    blue: "bg-blue-500/20 text-blue-400",
    green: "bg-green-500/20 text-green-400",
    purple: "bg-primary/20 text-primary",
    rose: "bg-rose-500/20 text-rose-400",
  };

  const bgClass = gradient
    ? `bg-gradient-to-br ${colors[color] || colors.pink}`
    : `bg-[#0a0a0f]/50 border ${colors[color] || colors.pink}`;

  return (
    <div
      className={`
        rounded-2xl p-6 shadow-lg shadow-pink-500/5 backdrop-blur-sm
        transition-all duration-300 hover:shadow-pink-500/15 
        hover:scale-[1.02] active:scale-[0.98] cursor-default
        ${bgClass}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconColors[color] || iconColors.pink} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <TrendingUp className={`w-4 h-4 ${color === "green" ? "text-green-400" : "text-pink-400/50"}`} />
      </div>
      <div className="mb-3">
        <p className="text-xs text-muted-foreground/70 font-semibold uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-4xl font-bold ${colors[color]?.split(" ").pop() || "text-pink-400"}`}>{value}</p>
      </div>
      {action && actionLabel && (
        <button
          onClick={action}
          className={`mt-3 text-sm font-semibold ${colors[color]?.split(" ").pop() || "text-pink-400"} hover:underline transition-all flex items-center gap-2 group`}
        >
          {actionLabel}
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
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
        transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97]
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

// ===== MAIN DASHBOARD =====
export function Dashboard() {
  const { user, loading: authLoading, logout, isAdmin, isStaff, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const [bots, setBots] = useState<BotType[]>([]);
  const [panels, setPanels] = useState<UserPanel[]>([]);
  const [transactions, setTransactions] = useState<Array<{ _id: string; type: string; txAmount: number; tzsAmount: number; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [couponOpen, setCouponOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [deployingAppName, setDeployingAppName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showBots, setShowBots] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [greeting, setGreeting] = useState("");
  const deployTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== GREETING =====
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    if (searchParams.get("trial") === "true") {
      setSearchParams({}, { replace: true });
      navigateWithLoader("/deploy?trial=true");
    }
  }, [searchParams, navigateWithLoader]);

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

  const fetchData = useCallback(async () => {
    try {
      const [botsData, panelsData, txData] = await Promise.all([
        getBots(),
        getMyPanels().catch(() => []),
        getPaymentHistory().catch(() => [])
      ]);
      if (Array.isArray(botsData)) setBots(botsData);
      if (Array.isArray(panelsData)) setPanels(panelsData);
      if (Array.isArray(txData)) setTransactions(txData.slice(0, 8));
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) fetchData();
  }, [user, authLoading, navigate, fetchData]);

  useEffect(() => {
    if (navOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [navOpen]);

  useEffect(() => {
    return () => { if (deployTimerRef.current) clearTimeout(deployTimerRef.current); };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshUser()]);
    setRefreshing(false);
  };

  if (authLoading) return <SplashLoader />;
  if (!user) return <SplashLoader />;

  // ===== BANNED USER =====
  if (user.isBanned) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/20 blur-3xl" />
          <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center relative">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-red-400 mb-2">Account Suspended</h1>
          <p className="text-muted-foreground max-w-sm">
            Your account has been suspended. You cannot perform any actions on this platform.
            Contact support for assistance.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/contact")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-muted hover:bg-muted text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Top Up SQ", icon: CreditCard, path: "/topup" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
    { label: "Tutorials", icon: Youtube, path: "/tutorials" },
    { label: "Community", icon: Users, path: "/community" },
    { label: "Social Boosting", icon: TrendingUp, path: "/smm" },
    { label: "My SMM Orders", icon: ListOrdered, path: "/smm/orders" },
    { label: "My Link Bot", icon: Bot, path: "/linkbot" },
    { label: "Website Hosting", icon: Globe, path: "/hosting" },
    ...(isStaff ? [{ label: "Staff Panel", icon: Server, path: "/staff" }] : []),
  ];

  const quickActions = [
    { label: "Deploy Bot", icon: Rocket, path: "/services/bots", color: "pink" },
    { label: "Boost Social", icon: TrendingUp, path: "/smm", color: "pink" },
    { label: "My Link Bot", icon: Bot, path: "/linkbot", color: "purple" },
    { label: "Host Website", icon: Globe, path: "/hosting", color: "blue" },
    { label: "Buy Panel", icon: Server, path: "/services/panels", color: "blue" },
    { label: "Top Up", icon: Coins, path: "/topup", color: "green" },
    { label: "Community", icon: Users, path: "/community", color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <TechBackground />

      {/* ===== ANIMATED BACKGROUND PARTICLES ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={`large-${i}`}
            className="absolute rounded-full bg-pink-500/5"
            style={{
              width: Math.random() * 6 + 3 + 'px',
              height: Math.random() * 6 + 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float-particle ${Math.random() * 15 + 10}s linear infinite`,
              animationDelay: Math.random() * 15 + 's',
            }}
          />
        ))}
        {[...Array(40)].map((_, i) => (
          <div
            key={`small-${i}`}
            className="absolute rounded-full bg-pink-400/10"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float-particle ${Math.random() * 20 + 15}s linear infinite`,
              animationDelay: Math.random() * 20 + 's',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,142,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0px) translateX(0px) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px) scale(1); opacity: 0; }
          }
          @keyframes slide-up {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up {
            animation: slide-up 0.5s ease-out forwards;
          }
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .text-gradient-pink {
            background: linear-gradient(135deg, #ec4899, #f472b6, #ec4899);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradient-shift 3s ease infinite;
          }
          @keyframes heartbeat {
            0%, 100% { transform: scale(1); }
            25% { transform: scale(1.1); }
            50% { transform: scale(1); }
          }
          .animate-heartbeat {
            animation: heartbeat 1.5s ease-in-out infinite;
          }
          @keyframes typing-dot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>

      {/* ===== NAVBAR ===== */}
      <nav className="border-b border-pink-500/10 sticky top-0 bg-[#0a0a0f]/80 backdrop-blur-xl z-50 shadow-lg shadow-pink-500/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                className="p-2.5 -ml-2 rounded-xl hover:bg-pink-500/10 transition-all duration-300 text-pink-400 hover:text-pink-300 hover:scale-110"
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <AnimatedLogo />
                <span className="font-bold text-xl text-white tracking-tight">STANY</span>
                <span className="px-2.5 py-1 text-[10px] font-bold bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-full shadow-lg shadow-pink-500/30">
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
                className="p-2.5 rounded-xl hover:bg-pink-500/10 transition-all duration-300 text-pink-400 hover:text-pink-300 relative hover:scale-110"
                aria-label="Profile"
              >
                <UserCircle className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-[#0a0a0f] animate-pulse" />
              </button>
              <PinkButton
                size="sm"
                onClick={() => navigateWithLoader("/topup")}
                className="hidden sm:flex !px-4 !py-2"
              >
                <Zap className="w-4 h-4" />
                Top Up
              </PinkButton>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== SIDENAV ===== */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-[#0a0a0f]/95 backdrop-blur-xl border-r border-pink-500/10 z-[110] transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${navOpen ? "translate-x-0" : "-translate-x-full"
          } shadow-2xl`}
      >
        <div className="flex items-center justify-between p-5 border-b border-pink-500/10">
          <div className="flex items-center gap-3">
            <AnimatedLogo />
            <span className="font-bold text-lg text-white">STANY</span>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            className="p-2.5 rounded-xl hover:bg-pink-500/10 transition-all duration-300 text-pink-400 hover:text-pink-300 hover:rotate-90"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col h-[calc(100%-73px)] overflow-y-auto">
          {user && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-pink-500/15 to-pink-600/5 border border-pink-500/25 shadow-xl shadow-pink-500/10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-pink-500/30">
                  {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {user.username ? `@${user.username}` : user.email}
                  </p>
                  <p className="text-xs text-pink-400/80 font-medium">{greeting} 👋</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-500/15 border border-pink-500/20 shadow-inner">
                <Coins className="w-5 h-5 text-pink-400" />
                <span className="text-sm font-bold text-pink-400">{user.txCoins} SQ</span>
                <span className="ml-auto text-xs text-pink-400/60 font-medium">Balance</span>
              </div>
            </div>
          )}

          <nav className="space-y-1 flex-1">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => { navigateWithLoader(item.path); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                  {item.label}
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))}

            <div className="pt-3 pb-2">
              <p className="px-4 text-[10px] font-bold text-pink-400/60 uppercase tracking-wider mb-1">Services</p>
              <button
                onClick={() => { navigateWithLoader("/services/bots"); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <Bot className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                  Bot Deployment
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
              </button>
              <button
                onClick={() => { navigateWithLoader("/services/panels"); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                  Panels
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <button
              onClick={() => { setReferralOpen(true); setNavOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                Refer & Earn
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
            </button>
            <button
              onClick={() => { setCouponOpen(true); setNavOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                Coupon Code
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
            </button>
            {isAdmin && (
              <button
                onClick={() => { navigateWithLoader("/admin"); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-all" />
              </button>
            )}
          </nav>

          <div className="space-y-1 border-t border-pink-500/10 pt-4 mt-4">
            <button
              onClick={() => { navigateWithLoader("/contact"); setNavOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all duration-300 group"
            >
              <MessageCircle className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
              Contact Support
            </button>
            <button
              onClick={() => { navigateWithLoader("/profile"); setNavOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-pink-500/10 transition-all duration-300 group"
            >
              <Settings className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
              Profile Settings
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-300 group"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ===== SPONSORED BANNERS (top of page) ===== */}
      <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <AdBanner />
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-[1]">
        {/* ===== HEADER ===== */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                {greeting}, <span className="text-gradient-pink">@{user.username || "User"}</span>
              </h1>
              <span className="text-3xl">👋</span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-base text-pink-300/80 font-medium tracking-wide">
                Stany Hosting — deploy, manage and grow
              </p>
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap animate-slide-up" style={{ animationDelay: "100ms" }}>
            <NotificationBell />
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-3 rounded-xl border border-pink-500/20 hover:bg-pink-500/10 hover:border-pink-500/40 transition-all duration-300 disabled:opacity-50 text-pink-400 hover:text-pink-300 hover:rotate-180 shadow-lg shadow-pink-500/10"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ===== QUICK ACTIONS ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {quickActions.map((action, idx) => (
            <QuickActionCard
              key={idx}
              icon={action.icon}
              label={action.label}
              color={action.color}
              delay={idx * 100 + 150}
              onClick={() => {
                if (action.path === "#") {
                  setReferralOpen(true);
                } else {
                  navigateWithLoader(action.path);
                }
              }}
            />
          ))}
        </div>

        {/* ===== REFERRAL & COUPON ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="rounded-2xl border border-primary/20 bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Invite friends, earn SQ</p>
            <p className="mt-1 text-xs text-muted-foreground">Share your referral code and get rewarded on every signup.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">{user.referralCode || "—"}</code>
              {user.referralCode && <CopyButton value={`${window.location.origin}/signup?ref=${user.referralCode}`} label="Copy link" />}
              <button onClick={() => setReferralOpen(true)} className="rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                Open referrals
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Have a coupon?</p>
            <p className="mt-1 text-xs text-muted-foreground">Redeem a coupon code and top up your balance instantly.</p>
            <button onClick={() => setCouponOpen(true)} className="mt-3 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
              Redeem coupon
            </button>
          </div>
        </div>

        {/* ===== DAILY REWARD & ACHIEVEMENTS ===== */}
        <div className="mb-10">
          <RewardsPanel />
        </div>

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            icon={Coins}
            label="SQ Balance"
            value={`${user.txCoins} SQ`}
            action={() => navigateWithLoader("/topup")}
            actionLabel="Top Up"
            color="pink"
            gradient
          />
          <StatCard
            icon={Bot}
            label="Active Bots"
            value={bots.length}
            action={() => navigateWithLoader("/mybots")}
            actionLabel="Manage Bots"
            color="blue"
            gradient
          />
          <StatCard
            icon={Server}
            label="Active Panels"
            value={panels.length}
            action={() => navigateWithLoader("/mypanels")}
            actionLabel="Manage Panels"
            color="purple"
            gradient
          />
        </div>

        {/* ===== SEND COINS CTA ===== */}
        <button
          onClick={() => navigateWithLoader("/send-coins")}
          className="mb-6 flex w-full items-center justify-between rounded-2xl border border-pink-500/25 bg-gradient-to-r from-pink-500/10 to-primary/5 p-5 text-left transition-all duration-300 hover:border-pink-400/50 hover:scale-[1.01] shadow-lg shadow-pink-500/5 hover:shadow-pink-500/15 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/30 to-pink-600/20 flex items-center justify-center border border-pink-500/30">
              <Gift className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <p className="font-bold text-base text-white group-hover:text-pink-300 transition-colors">Send SQ coins</p>
              <p className="text-sm text-pink-300/70 mt-0.5">Transfer to a username or share a gift link</p>
            </div>
          </div>
          <span className="rounded-full bg-gradient-to-r from-pink-500/20 to-pink-600/10 px-4 py-2 text-xs font-bold text-pink-200 border border-pink-500/30 flex items-center gap-2 group-hover:scale-110 transition-transform">
            Open
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </button>

        {/* ===== DEPLOYING BOT ===== */}
        {deployingAppName && (
          <div className="mb-6 p-5 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-pink-600/5 flex items-center gap-4 shadow-xl shadow-pink-500/15 animate-slide-up backdrop-blur-sm">
            <div className="relative">
              <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-pink-300">Bot is deploying...</p>
              <p className="text-xs text-pink-400/80 mt-1">
                <span className="font-mono bg-pink-500/15 px-2 py-1 rounded-md border border-pink-500/20">{deployingAppName}</span>
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

        {/* ===== EXPIRING BOTS ===== */}
        {bots.filter(b =>
          !b.isTrial && b.status !== "deleted" && b.status !== "expired" &&
          new Date(b.expiresAt).getTime() - Date.now() > 0 &&
          new Date(b.expiresAt).getTime() - Date.now() <= 3 * 24 * 60 * 60 * 1000
        ).map(b => {
          const daysLeft = Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
          return (
            <div key={b._id + "-expiry"} className="mb-4 p-5 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-rose-600/5 flex items-center gap-4 animate-slide-up backdrop-blur-sm shadow-lg shadow-rose-500/10">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                <Clock className="w-6 h-6 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose-300">Bot expiring soon</p>
                <p className="text-xs text-rose-400/80 mt-1">
                  <span className="font-mono bg-rose-500/15 px-2 py-1 rounded-md border border-rose-500/20">{b.herokuAppName}</span>
                  {" "}expires in <span className="font-bold text-rose-300">{daysLeft}</span> day{daysLeft !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => navigateWithLoader("/mybots")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-rose-600/10 hover:from-rose-500/30 hover:to-rose-600/20 text-rose-300 text-xs font-bold transition-all duration-300 shrink-0 border border-rose-500/30 hover:scale-105 shadow-lg shadow-rose-500/20"
              >
                Renew Now
              </button>
            </div>
          );
        })}

        {/* ===== HISTORY LINK ===== */}
        <button
          onClick={() => navigateWithLoader("/history")}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-left transition-all duration-300 hover:border-primary/40 hover:scale-[1.01] shadow-lg shadow-primary/5 hover:shadow-primary/15 group"
        >
          <span className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-foreground">Deploy & reward history</span>
          </span>
          <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
        </button>

        {/* ===== DEVELOPER API KEYS ===== */}
        <button
          onClick={() => navigateWithLoader("/api-keys")}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-left transition-all duration-300 hover:border-primary/40 hover:scale-[1.01] shadow-lg shadow-primary/5 hover:shadow-primary/15 group"
        >
          <span className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-foreground">Developer API keys &amp; docs</span>
          </span>
          <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
        </button>



        {/* ===== BOTS LIST (collapsed by default) ===== */}
        <button
          onClick={() => setShowBots((v) => !v)}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-pink-500/15 bg-pink-500/5 px-5 py-4 text-left transition-all duration-300 hover:border-pink-400/40 hover:scale-[1.01] shadow-lg shadow-pink-500/5 hover:shadow-pink-500/15 backdrop-blur-sm group"
        >
          <span className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
              <Bot className="w-5 h-5 text-pink-400" />
            </div>
            <span className="font-bold text-white">Your Bots</span>
            <span className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-pink-500/30 to-pink-600/20 text-pink-400 rounded-full border border-pink-500/30 shadow-lg shadow-pink-500/20">
              {bots.length}
            </span>
          </span>
          <span className="text-xs font-bold text-pink-300 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            {showBots ? "Hide" : "Show"}
            <ChevronRight className="w-3 h-3" />
          </span>
        </button>

        {!showBots ? null : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-14 h-14 animate-spin text-pink-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-pink-400 animate-ping" />
                </div>
              </div>
              <p className="text-sm text-pink-400/70 animate-pulse font-medium">Loading your bots...</p>
            </div>
          </div>
        ) : bots.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-pink-400" />
                <h2 className="font-bold text-lg text-white">Your Bots</h2>
                <span className="px-2.5 py-1 text-xs font-bold bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/20">
                  {bots.length}
                </span>
              </div>
              <button
                onClick={() => navigateWithLoader("/mybots")}
                className="text-sm text-pink-400 hover:text-pink-300 hover:underline font-bold transition-all flex items-center gap-1 group"
              >
                View all
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bots.slice(0, 4).map(bot => (
                <BotCard
                  key={bot._id}
                  bot={bot}
                  onUpdate={fetchData}
                  deploying={deployingAppName === bot.herokuAppName}
                  coinBalance={user.txCoins}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-8 p-8 rounded-2xl border border-pink-500/10 bg-gradient-to-br from-pink-500/5 to-transparent text-center backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
              <Bot className="w-8 h-8 text-pink-400/70" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Bots Deployed</h3>
            <p className="text-sm text-pink-400/70 mb-6">Deploy your first bot to get started</p>
            <PinkButton onClick={() => navigateWithLoader("/services/bots")}>
              <Rocket className="w-4 h-4" />
              Deploy Bot
            </PinkButton>
          </div>
        )}

        {/* ===== SUPPORT & TUTORIALS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigateWithLoader("/contact")}
            className="group p-5 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent hover:from-pink-500/15 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-pink-500/15 text-left backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-pink-500/20">
                <MessageCircle className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                  Contact Support
                </p>
                <p className="text-sm text-pink-400/70 mt-0.5">Get help via WhatsApp or Telegram</p>
              </div>
              <ChevronRight className="w-4 h-4 text-pink-400/50 group-hover:text-pink-400 group-hover:translate-x-1 transition-all ml-auto" />
            </div>
          </button>
          <button
            onClick={() => navigateWithLoader("/tutorials")}
            className="group p-5 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent hover:from-pink-500/15 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-pink-500/15 text-left backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-pink-500/20">
                <Youtube className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                  Video Tutorials
                </p>
                <p className="text-sm text-pink-400/70 mt-0.5">Watch step-by-step guides</p>
              </div>
              <ChevronRight className="w-4 h-4 text-pink-400/50 group-hover:text-pink-400 group-hover:translate-x-1 transition-all ml-auto" />
            </div>
          </button>
        </div>

        {/* ===== TRANSACTIONS (collapsed by default) ===== */}
        {transactions.length > 0 && (
          <button
            onClick={() => setShowActivity((v) => !v)}
            className="mt-6 flex w-full items-center justify-between rounded-2xl border border-pink-500/15 bg-pink-500/5 px-5 py-4 text-left transition-all duration-300 hover:border-pink-400/40 hover:scale-[1.01] shadow-lg shadow-pink-500/5 hover:shadow-pink-500/15 backdrop-blur-sm group"
          >
            <span className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                <Clock className="w-5 h-5 text-pink-400" />
              </div>
              <span className="font-bold text-white">Recent Activity</span>
              <span className="px-2.5 py-1 text-xs font-bold bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/20">
                {transactions.length}
              </span>
            </span>
            <span className="text-xs font-bold text-pink-300 group-hover:translate-x-1 transition-transform flex items-center gap-1">
              {showActivity ? "Hide" : "Show"}
              <ChevronRight className="w-3 h-3" />
            </span>
          </button>
        )}
        {showActivity && transactions.length > 0 && (
          <div className="mt-4 animate-slide-up">
            <div className="rounded-2xl border border-pink-500/10 overflow-hidden bg-[#0a0a0f]/50 shadow-xl shadow-pink-500/10 backdrop-blur-sm">
              {transactions.map((t, i) => {
                const isCredit = t.type === "admin_grant" || t.type === "topup" || t.type === "refund";
                const isFailed = t.status === "failed";
                const isPending = t.status === "pending";
                const labelMap: Record<string, string> = {
                  topup: "SQ Top-Up",
                  deploy: "Bot Deployed",
                  renew: "Bot Renewed",
                  admin_grant: "SQ Granted",
                  refund: "Refund",
                  panel: "Panel Purchase"
                };
                const label = labelMap[t.type] ?? t.type.replace(/_/g, " ");
                const sub = t.type === "topup" && t.tzsAmount > 0 ? `TZS ${t.tzsAmount.toLocaleString()}` :
                  t.type === "deploy" || t.type === "renew" ? "spent" :
                    t.type === "admin_grant" ? "admin bonus" : "";
                const iconEl = t.type === "deploy" || t.type === "renew"
                  ? <Bot className="w-4 h-4 text-pink-400" />
                  : t.type === "topup"
                    ? <CreditCard className="w-4 h-4 text-green-400" />
                    : t.type === "panel"
                      ? <Server className="w-4 h-4 text-primary" />
                      : <Coins className={`w-4 h-4 ${isCredit ? "text-rose-400" : "text-pink-400"}`} />;
                return (
                  <div
                    key={t._id}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-pink-500/5 transition-all duration-300 ${i < transactions.length - 1 ? "border-b border-pink-500/5" : ""
                      }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isFailed ? "bg-muted" :
                          isCredit ? "bg-green-500/15 border border-green-500/20" :
                            "bg-pink-500/15 border border-pink-500/20"
                        }`}>
                        {iconEl}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate capitalize">{label}</p>
                        <p className="text-xs text-pink-400/70 truncate mt-0.5">
                          {sub ? `${sub} · ` : ""}
                          {new Date(t.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0 ml-4">
                      <span className={`text-sm font-bold tabular-nums ${isFailed ? "text-muted-foreground line-through" :
                          isCredit ? "text-green-400" :
                            "text-pink-400"
                        }`}>
                        {isCredit ? "+" : "-"}{Math.abs(t.txAmount)} SQ
                      </span>
                      {isPending && (
                        <span className="text-[10px] font-bold text-rose-500 animate-pulse uppercase tracking-wide">pending</span>
                      )}
                      {isFailed && (
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">failed</span>
                      )}
                      {isCredit && !isPending && !isFailed && (
                        <span className="flex items-center gap-0.5">
                          <Check className="w-3 h-3 text-green-400" />
                          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">complete</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== FOOTER ===== */}
        <div className="mt-12 pt-6 border-t border-pink-500/10 text-center">
          <p className="text-xs text-muted-foreground/60 font-medium">
            © 2026 STANY. All rights reserved. Made with <Heart className="w-3 h-3 inline text-pink-400 animate-heartbeat" />
            {" "}in Tanzania
          </p>
        </div>
      </main>

      {/* ===== MODALS ===== */}
      <CouponModal isOpen={couponOpen} onClose={() => setCouponOpen(false)} onSuccess={() => { fetchData(); refreshUser(); }} />
      <ReferralModal
        isOpen={referralOpen}
        onClose={() => setReferralOpen(false)}
        referralCode={user.referralCode || ""}
      />
    </div>
  );
}