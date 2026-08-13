import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/PageLoader";
import { useNavLoader } from "@/App";
import { updateUsername } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft, UserCircle, Mail, Coins, LogOut, Send,
  Shield, Copy, Check, Pencil, X, Palette,
  Sparkles, Heart, Crown, ChevronRight
} from "lucide-react";

type AccentColor = "violet" | "red" | "blue" | "green" | "orange" | "pink" | "teal" | "yellow" | "rose" | "indigo" | "cyan" | "amber";

const ACCENT_OPTIONS: { key: AccentColor; label: string; color: string; hsl: string }[] = [
  { key: "violet", label: "Violet", color: "#8b5cf6", hsl: "262 83% 58%" },
  { key: "indigo", label: "Indigo", color: "#6366f1", hsl: "239 84% 67%" },
  { key: "blue", label: "Blue", color: "#3b82f6", hsl: "217 91% 60%" },
  { key: "cyan", label: "Cyan", color: "#06b6d4", hsl: "192 91% 44%" },
  { key: "teal", label: "Teal", color: "#14b8a6", hsl: "173 80% 40%" },
  { key: "green", label: "Green", color: "#22c55e", hsl: "142 71% 45%" },
  { key: "yellow", label: "Yellow", color: "#eab308", hsl: "48 96% 53%" },
  { key: "amber", label: "Amber", color: "#f59e0b", hsl: "38 92% 50%" },
  { key: "orange", label: "Orange", color: "#f97316", hsl: "25 95% 53%" },
  { key: "red", label: "Red", color: "#ef4444", hsl: "0 72% 51%" },
  { key: "rose", label: "Rose", color: "#f43f5e", hsl: "347 77% 50%" },
  { key: "pink", label: "Pink", color: "#ec4899", hsl: "330 81% 60%" },
];

function applyAccent(accent: AccentColor) {
  const found = ACCENT_OPTIONS.find(a => a.key === accent);
  if (!found) return;
  let styleEl = document.getElementById("__accent_override__") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "__accent_override__";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `:root, .dark { --primary: ${found.hsl}; --ring: ${found.hsl}; }`;
  localStorage.setItem("accent", accent);
}

function useAccent() {
  const [accent, setAccentState] = useState<AccentColor>(() => {
    return (localStorage.getItem("accent") as AccentColor) || "blue";
  });
  useEffect(() => { applyAccent(accent); }, [accent]);
  const setAccent = (a: AccentColor) => { setAccentState(a); applyAccent(a); };
  return { accent, setAccent };
}

export function initStoredAccent() {
  const accent = (localStorage.getItem("accent") as AccentColor) || "blue";
  applyAccent(accent);
}

// ===== ANIMATED LOGO =====
function AnimatedLogo() {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-500" />
      <img
        src="https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg"
        alt="STANY Host"
        className="relative w-8 h-8 rounded-xl object-cover ring-2 ring-pink-400/50 shadow-lg shadow-pink-500/20"
      />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-pulse ring-2 ring-[#0a0a0f]" />
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
        transition-all duration-300 transform hover:scale-[1.02] 
        rounded-xl border border-pink-400/20
        ${className || ""}
      `}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    </Button>
  );
}

export function Profile() {
  const { user, loading: authLoading, logout, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { accent, setAccent } = useAccent();
  const { showToast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (themePickerOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [themePickerOpen]);

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch { }
  };

  const handleSaveUsername = async () => {
    const u = newUsername.trim();
    if (!u || u.length < 3) { showToast("Username must be at least 3 characters", "error"); return; }
    setSavingUsername(true);
    try {
      const res = await updateUsername(u) as { success?: boolean; username?: string; error?: string };
      if (res.success) {
        showToast("Username updated!", "success");
        setEditingUsername(false);
        setNewUsername("");
        refreshUser();
      } else {
        showToast(res.error || "Failed to update username", "error");
      }
    } catch {
      showToast("Failed to update username", "error");
    } finally {
      setSavingUsername(false);
    }
  };

  if (authLoading) return <PageLoader />;
  if (!user) return <PageLoader />;

  const referralUrl = `${window.location.origin}/signup?ref=${user.referralCode || ""}`;
  const currentAccent = ACCENT_OPTIONS.find(a => a.key === accent) || ACCENT_OPTIONS[0];

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
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,142,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0px) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
          }
        `}</style>
      </div>

      {/* ===== NAVBAR ===== */}
      <nav className="border-b border-pink-500/10 sticky top-0 bg-[#0a0a0f]/80 z-50 shadow-lg shadow-pink-500/5">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex items-center h-16 gap-3">
            <button
              onClick={() => navigateWithLoader("/dashboard")}
              className="p-2.5 -ml-2 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400 hover:text-pink-300"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <AnimatedLogo />
            <div className="flex items-center gap-2.5">
              <UserCircle className="w-4 h-4 text-pink-400" />
              <h1 className="font-bold text-lg text-white">Profile</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/20">
                v2.0
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-xl mx-auto px-4 py-8 space-y-4 relative z-[1]">
        {/* ===== PROFILE CARD ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 p-6 flex flex-col items-center gap-4 shadow-lg shadow-pink-500/5">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl blur opacity-30" />
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 border-2 border-pink-500/30 flex items-center justify-center">
              <UserCircle className="w-12 h-12 text-pink-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center">
              <span className="text-[10px] text-white">✓</span>
            </div>
          </div>

          {editingUsername ? (
            <div className="w-full max-w-xs space-y-2">
              <Input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="new_username"
                maxLength={20}
                autoFocus
                className="border-pink-500/20 focus:ring-pink-500/30 focus:border-pink-500/50 bg-[#0a0a0f]/50 text-white"
                onKeyDown={e => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
              />
              <div className="flex gap-2">
                <PinkButton size="sm" className="flex-1" onClick={handleSaveUsername} disabled={savingUsername}>
                  {savingUsername ? "Saving..." : "Save"}
                </PinkButton>
                <Button size="sm" variant="outline" className="border-pink-500/20 text-pink-400 hover:bg-pink-500/10" onClick={() => { setEditingUsername(false); setNewUsername(""); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-xs text-pink-400/50 text-center">Letters, numbers, underscores only</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  {user.username ? `@${user.username}` : "No username set"}
                </h2>
                <button
                  onClick={() => { setNewUsername(user.username || ""); setEditingUsername(true); }}
                  className="p-1.5 rounded-lg hover:bg-pink-500/10 transition-colors text-pink-400/50 hover:text-pink-400"
                  title="Edit username"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-pink-400/60 mt-0.5">{user.email}</p>
              {!user.username && (
                <button
                  onClick={() => setEditingUsername(true)}
                  className="mt-2 text-xs text-pink-400 hover:text-pink-300 hover:underline transition-all"
                >
                  + Set a username
                </button>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Administrator</span>
            </div>
          )}
        </div>

        {/* ===== STATS CARD ===== */}
        <div className="rounded-2xl bg-[#0a0a0f]/50 border border-pink-500/10 divide-y divide-pink-500/10">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
                <Coins className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-pink-400/50">SQ Balance</p>
                <p className="text-lg font-bold text-pink-400">{user.txCoins} SQ</p>
              </div>
            </div>
            <PinkButton size="sm" onClick={() => navigateWithLoader("/topup")}>
              <Sparkles className="w-3.5 h-3.5" />
              Top Up
            </PinkButton>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-primary/60">Transfer SQ</p>
                <p className="text-sm font-medium text-foreground">Send coins or create a gift link</p>
              </div>
            </div>
            <PinkButton size="sm" onClick={() => navigateWithLoader("/send-coins")}>
              <Send className="w-3.5 h-3.5" />
              Send
            </PinkButton>
          </div>



          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-pink-400/50">Email</p>
                <p className="text-sm font-medium text-white truncate max-w-[200px]">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => copyText(user.email, setCopiedEmail)}
              className="p-2 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400/50 hover:text-pink-400"
            >
              {copiedEmail ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {user.referralCode && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                  <UserCircle className="w-5 h-5 text-pink-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-pink-400/50">Referral Link</p>
                  <p className="text-sm font-mono text-pink-400/70 truncate">{referralUrl}</p>
                </div>
              </div>
              <button
                onClick={() => copyText(referralUrl, setCopiedRef)}
                className="p-2 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400/50 hover:text-pink-400 shrink-0 ml-2"
              >
                {copiedRef ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* ===== SETTINGS CARD ===== */}
        <div className="rounded-2xl bg-[#0a0a0f]/50 border border-pink-500/10 overflow-hidden">
          <div className="p-4 border-b border-pink-500/10">
            <h3 className="text-sm font-semibold text-pink-400/50 uppercase tracking-wider">Settings</h3>
          </div>
          <div className="divide-y divide-pink-500/10">
            <div className="p-4 flex items-center justify-between" data-theme-picker>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Color Theme</p>
                  <p className="text-xs text-pink-400/50 capitalize">{currentAccent.label}</p>
                </div>
              </div>
              <div>
                <button
                  onClick={() => setThemePickerOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-pink-500/20 hover:bg-pink-500/10 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: currentAccent.color }}
                  />
                  <span className="text-sm text-white">{currentAccent.label}</span>
                  <svg
                    className={`w-3.5 h-3.5 text-pink-400/50 transition-transform ${themePickerOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {themePickerOpen && createPortal(
                  <div
                    className="fixed inset-0 z-[600] flex items-center justify-center p-4"
                    onClick={() => setThemePickerOpen(false)}
                  >
                    <div className="absolute inset-0 bg-black/70" />
                    <div
                      className="relative bg-[#0a0a0f] border border-pink-500/20 rounded-2xl shadow-2xl overflow-hidden"
                      style={{ width: "13rem", maxHeight: "70vh", overflowY: "auto" }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="px-4 py-3 border-b border-pink-500/10">
                        <p className="text-sm font-semibold text-white">Color Theme</p>
                      </div>
                      {ACCENT_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => { setAccent(opt.key); setThemePickerOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-pink-500/10 transition-colors text-sm ${accent === opt.key ? "bg-pink-500/5" : ""
                            }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: opt.color,
                              borderColor: accent === opt.key ? "white" : "transparent"
                            }}
                          >
                            {accent === opt.key && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                          <span className={accent === opt.key ? "text-white font-medium" : "text-gray-400"}>
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => navigateWithLoader("/admin")}
                className="w-full p-4 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-amber-400">Admin Panel</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400/30" />
              </button>
            )}

            <button
              onClick={logout}
              className="w-full p-4 flex items-center gap-3 hover:bg-red-500/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-400">Sign Out</p>
            </button>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="pt-4 text-center">
          <p className="text-xs text-pink-400/30">
            Made with <Heart className="w-3 h-3 inline text-pink-400 animate-heartbeat" /> by STANY
          </p>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}