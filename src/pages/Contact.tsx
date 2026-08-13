import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useNavLoader } from "@/App";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { AppLogoIcon } from "@/components/AppLogo";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft, Coins, Youtube, Mail, MessageCircle,
  LayoutDashboard, CreditCard, BookOpen, UserCircle, LogOut,
  Bot, Shield, ChevronRight, Moon, Sun, Menu, X, ExternalLink,
  Heart, Sparkles
} from "lucide-react";

// ===== THEME =====
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
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center ring-2 ring-pink-400/50 shadow-lg shadow-pink-500/20">
        <AppLogoIcon className="w-5 h-5 text-white drop-shadow-sm" />
      </div>
      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-400 rounded-full animate-pulse ring-2 ring-[#0a0a0f]" />
    </div>
  );
}

export function Contact() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { theme, toggle: toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (navOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [navOpen]);

  if (authLoading) return <PageLoader />;
  if (!user) return <PageLoader />;

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Top Up SQ", icon: CreditCard, path: "/topup" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
    { label: "Tutorials", icon: Youtube, path: "/tutorials" },
  ];

  const contacts = [
    {
      label: "WhatsApp",
      handle: "+255 620 490 076",
      description: "Chat with us on WhatsApp for fast support",
      href: "https://wa.me/255620490076",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      hoverBg: "hover:bg-green-500/15",
    },
    {
      label: "WhatsApp Channel",
      handle: "Stany Host Updates",
      description: "Join our WhatsApp channel for news and updates",
      href: "https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      hoverBg: "hover:bg-green-500/15",
    },
    {
      label: "Telegram",
      handle: "@stanytz076",
      description: "Contact us via Telegram",
      href: "https://t.me/Stanytz076",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      hoverBg: "hover:bg-sky-500/15",
    },
    {
      label: "Email",
      handle: "stanytz953@gmail.com",
      description: "Send us an email for detailed inquiries",
      href: "mailto:stanytz953@gmail.com",
      icon: <Mail className="w-6 h-6" />,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20",
      hoverBg: "hover:bg-pink-500/15",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <TechBackground />
      
      {/* ===== ANIMATED PARTICLES ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-pink-500/5"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float-particle ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: Math.random() * 10 + 's',
            }}
          />
        ))}
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0px) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
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
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-pink-400" />
                </div>
                Contact Support
              </h1>
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            </div>
            <p className="text-sm text-pink-400/70 mt-1 ml-14">Reach us through any of the channels below</p>
          </div>
        </div>

        {/* ===== CONTACT CARDS ===== */}
        <div className="max-w-2xl">
          <div className="space-y-4">
            {contacts.map((c, idx) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className={`group flex items-center gap-5 p-5 rounded-2xl border ${c.border} ${c.bg} ${c.hoverBg} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/10 animate-slide-up`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0 ${c.color} group-hover:scale-110 transition-transform duration-300`}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${c.color}`}>{c.label}</p>
                  <p className="text-base font-bold text-white truncate">{c.handle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-pink-500/10 transition-colors">
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-pink-400 transition-colors" />
                </div>
              </a>
            ))}
          </div>

          {/* ===== FOOTER NOTE ===== */}
          <div className="mt-8 p-5 rounded-2xl border border-pink-500/10 bg-gradient-to-br from-pink-500/5 to-transparent">
            <p className="text-sm text-muted-foreground text-center">
              Our support team typically responds within <span className="text-pink-400 font-medium">a few hours</span>.
              For urgent issues, <span className="text-green-400 font-medium">WhatsApp</span> is the fastest channel.
            </p>
            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground/50">
              Made with <Heart className="w-3 h-3 text-pink-400 animate-heartbeat" /> by STANY
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes slide-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
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
      `}</style>
    </div>
  );
}