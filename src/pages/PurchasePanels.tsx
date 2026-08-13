import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getPanelPlans, purchasePanel, purchaseAdminPanel } from "@/lib/api";
import type { PanelPlan } from "@/types";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { Modal } from "@/components/Modal";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft, Coins, Loader2, Shield, Server,
  LayoutDashboard, CreditCard, BookOpen, UserCircle, LogOut,
  ChevronRight, Moon, Sun, Menu, X, Bot, Check, Star, Crown, Zap,
  Sparkles, Heart
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

// ===== PARTICLES =====
function Particles() {
  return (
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
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.2); }
          28% { transform: scale(1); }
          42% { transform: scale(1.1); }
          70% { transform: scale(1); }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        .animate-heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export function PurchasePanels() {
  const { user, loading: authLoading, logout, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const [plans, setPlans] = useState<PanelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [buyModal, setBuyModal] = useState<PanelPlan | null>(null);
  const [buying, setBuying] = useState(false);
  const [purchasedPlan, setPurchasedPlan] = useState<{ username: string; password: string; loginUrl: string } | null>(null);
  const [adminBuying, setAdminBuying] = useState(false);
  const [adminModal, setAdminModal] = useState(false);

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
    if (purchasedPlan) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [purchasedPlan]);

  useEffect(() => {
    if (!user) return;
    getPanelPlans()
      .then(data => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => showToast("Failed to load panel plans", "error"))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <PageLoader />;
  if (!user) return <PageLoader />;

  const handleBuy = async () => {
    if (!buyModal) return;
    if (user.txCoins < buyModal.txCost) {
      showToast("Insufficient SQ — please top up", "error");
      setBuyModal(null);
      navigateWithLoader("/topup");
      return;
    }
    setBuying(true);
    try {
      const res = await purchasePanel(buyModal._id) as { success?: boolean; error?: string; code?: string; panel?: { panelUsername: string; panelPassword: string; panelLoginUrl: string } };
      if (res.success) {
        if (res.panel) {
          setPurchasedPlan({
            username: res.panel.panelUsername,
            password: res.panel.panelPassword,
            loginUrl: res.panel.panelLoginUrl,
          });
        }
        showToast("Panel purchased!", "success");
        setBuyModal(null);
        await refreshUser();
      } else if (res.code === "INSUFFICIENT_COINS") {
        showToast("Insufficient SQ — redirecting to Top Up", "error");
        setBuyModal(null);
        navigateWithLoader("/topup");
      } else {
        showToast(res.error || "Purchase failed", "error");
      }
    } catch { showToast("Purchase failed", "error"); }
    finally { setBuying(false); }
  };

  const handleBuyAdmin = async () => {
    if (user.txCoins < 100) {
      showToast("Insufficient SQ — please top up", "error");
      setAdminModal(false);
      navigateWithLoader("/topup");
      return;
    }
    setAdminBuying(true);
    try {
      const res = await purchaseAdminPanel() as { success?: boolean; error?: string; code?: string; panel?: { panelUsername: string; panelPassword: string; panelLoginUrl: string } };
      if (res.success) {
        if (res.panel) {
          setPurchasedPlan({ username: res.panel.panelUsername, password: res.panel.panelPassword, loginUrl: res.panel.panelLoginUrl });
        }
        showToast("Admin access granted!", "success");
        setAdminModal(false);
        await refreshUser();
      } else if (res.code === "INSUFFICIENT_COINS") {
        showToast("Insufficient SQ — redirecting to Top Up", "error");
        setAdminModal(false);
        navigateWithLoader("/topup");
      } else {
        showToast(res.error || "Purchase failed", "error");
      }
    } catch { showToast("Purchase failed", "error"); }
    finally { setAdminBuying(false); }
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Top Up SQ", icon: CreditCard, path: "/topup" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <TechBackground />
      <Particles />

      {/* ===== PURCHASED PLAN MODAL ===== */}
      {purchasedPlan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0a0a0f]/90 p-4">
          <div className="bg-[#0a0a0f] border border-pink-500/20 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl shadow-pink-500/10">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Panel Ready! 🎉</h2>
              <p className="text-sm text-pink-400/70">Your panel credentials are below. Save them securely.</p>
            </div>
            <div className="space-y-2 bg-pink-500/5 rounded-xl p-3 text-sm border border-pink-500/10">
              <div className="flex items-center justify-between">
                <span className="text-pink-400/60 text-xs">Username</span>
                <span className="font-mono font-semibold text-xs text-white">{purchasedPlan.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-pink-400/60 text-xs">Password</span>
                <span className="font-mono font-semibold text-xs text-white">{purchasedPlan.password}</span>
              </div>
            </div>
            <a href={purchasedPlan.loginUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold text-sm hover:from-pink-400 hover:to-pink-500 transition-all duration-300 shadow-lg shadow-pink-500/30">
              Open Panel
            </a>
            <button onClick={() => setPurchasedPlan(null)}
              className="w-full h-9 text-sm text-pink-400/50 hover:text-pink-400 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

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
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium bg-pink-500/10 text-white transition-all"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-pink-400" />
                  Panels
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
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
                  <Server className="w-5 h-5 text-pink-400" />
                </div>
                Purchase Panels
              </h1>
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            </div>
            <p className="text-sm text-pink-400/70 mt-1 ml-14">Choose a game server panel plan</p>
          </div>
        </div>

        {/* ===== PLANS GRID ===== */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-14 h-14 animate-spin text-pink-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-pink-400 animate-ping" />
                </div>
              </div>
              <p className="text-sm text-pink-400/70 animate-pulse">Loading panel plans...</p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-4">
              <Server className="w-10 h-10 text-pink-400/40" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No plans available</h3>
            <p className="text-sm text-pink-400/60">Check back soon for new panel plans.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((plan, idx) => (
              <div 
                key={plan._id} 
                className={`relative rounded-2xl border bg-[#0a0a0f]/50 p-6 flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/10 animate-slide-up ${
                  plan.isBestDeal ? "border-pink-500/40 ring-2 ring-pink-500/20" : "border-pink-500/10"
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {plan.isBestDeal && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 text-white text-[10px] font-semibold shadow-lg shadow-pink-500/30">
                      <Star className="w-3 h-3" />BEST DEAL
                    </span>
                  </div>
                )}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                    <p className="text-xs text-pink-400/60 mt-1">{plan.description}</p>
                  </div>
                  <ShareButton
                    path={`/services/panels/purchasepanel?plan=${plan._id}`}
                    title={`${plan.name} — Stany Hosting panel plan`}
                    text={`${plan.name}: ${plan.ram} RAM · ${plan.disk} disk · ${plan.cpu} CPU for ${plan.txCost} SQ on Stany Hosting`}
                  />
                </div>
                <div className="space-y-2 mb-5 flex-1">
                  <div className="flex items-center justify-between text-xs border-b border-pink-500/5 pb-1.5">
                    <span className="text-pink-400/50">RAM</span>
                    <span className="font-medium text-white">{plan.ram}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-pink-500/5 pb-1.5">
                    <span className="text-pink-400/50">Disk</span>
                    <span className="font-medium text-white">{plan.disk}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-pink-400/50">CPU</span>
                    <span className="font-medium text-white">{plan.cpu}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-pink-400">{plan.txCost} SQ</span>
                    {plan.originalTxCost > plan.txCost && (
                      <span className="text-xs text-pink-400/40 line-through">{plan.originalTxCost} SQ</span>
                    )}
                  </div>
                </div>
                <PinkButton
                  className="w-full"
                  onClick={() => user.txCoins < plan.txCost ? navigateWithLoader("/topup") : setBuyModal(plan)}
                >
                  {user.txCoins < plan.txCost ? "Top Up" : "Purchase"}
                </PinkButton>
              </div>
            ))}
          </div>
        )}

        {/* ===== ADMIN PANEL CARD - UPDATED TO 100 SQ ===== */}
        <div className="mt-8">
          <div className="relative rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 p-6 pt-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-bold shadow-lg shadow-amber-500/30">
                <Crown className="w-3 h-3" />ADMIN ACCESS
              </span>
            </div>
            <div className="flex items-start gap-4 mt-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Crown className="w-7 h-7 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-amber-300">Admin Panel Access</h3>
                <p className="text-xs text-amber-400/60 mt-0.5">Full administrator privileges on the Pterodactyl panel</p>
                <div className="mt-3 space-y-1.5">
                  {["Manage all servers & users", "Access node & allocation controls", "Full panel dashboard access"].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-amber-200/80">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-2xl font-extrabold text-amber-400">100 SQ</span>
                <span className="text-xs text-amber-400/50 ml-2">one-time</span>
              </div>
              <Button
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300"
                onClick={() => user.txCoins < 100 ? navigateWithLoader("/topup") : setAdminModal(true)}
              >
                {user.txCoins < 100 ? "Top Up" : "Purchase"}
              </Button>
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="mt-12 pt-6 border-t border-pink-500/10 text-center">
          <p className="text-xs text-muted-foreground/50">
            Made with <Heart className="w-3 h-3 inline text-pink-400 animate-heartbeat" /> by STANY
          </p>
        </div>
      </main>

      {/* ===== BUY MODAL ===== */}
      <Modal isOpen={!!buyModal} onClose={() => setBuyModal(null)} title="Confirm Purchase" maxWidth="max-w-sm">
        {buyModal && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/10 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-pink-400/60">Plan</span>
                <span className="font-semibold text-white">{buyModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-400/60">Cost</span>
                <span className="font-bold text-pink-400">{buyModal.txCost} SQ</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-pink-500/10">
                <span className="text-pink-400/60">Your balance</span>
                <span className="font-semibold text-white">{user.txCoins} SQ</span>
              </div>
            </div>
            <p className="text-xs text-pink-400/50">After purchase your credentials will be shown once. Save them securely.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-pink-500/20 text-pink-400 hover:bg-pink-500/10" onClick={() => setBuyModal(null)} disabled={buying}>Cancel</Button>
              <PinkButton className="flex-1" onClick={handleBuy} disabled={buying}>
                {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </PinkButton>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== ADMIN MODAL - UPDATED TO 100 SQ ===== */}
      <Modal isOpen={adminModal} onClose={() => setAdminModal(false)} title="Confirm Admin Purchase" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-amber-400/60">Package</span>
              <span className="font-semibold text-amber-300">Admin Panel Access</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400/60">Cost</span>
              <span className="font-bold text-amber-400">100 SQ</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-amber-500/20">
              <span className="text-amber-400/60">Your balance</span>
              <span className="font-semibold text-white">{user?.txCoins} SQ</span>
            </div>
          </div>
          <p className="text-xs text-amber-400/50">You will receive full admin credentials. Save them immediately after purchase — they are shown only once.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10" onClick={() => setAdminModal(false)} disabled={adminBuying}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold border-0 shadow-lg shadow-amber-500/20"
              onClick={handleBuyAdmin}
              disabled={adminBuying}
            >
              {adminBuying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}