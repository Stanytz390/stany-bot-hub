import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  Gamepad2,
  Film,
  Server,
  Bot,
  Coins,
  Search,
  Menu,
  X,
  User,
  Shield,
  LogOut,
  Layers,
  ChevronDown,
  TrendingUp,
} from "lucide-react";

export function AppNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const isAdmin = user?.role === "admin" || user?.email === "stanytzhosting@gmail.com";

  const navLinks = [
    { label: "Games", path: "/games", icon: Gamepad2 },
    { label: "Movies", path: "/movies", icon: Film },
    { label: "Hosting", path: "/hosting", icon: Server },
    { label: "Bots", path: "/services/bots", icon: Bot },
    { label: "SMM", path: "/smm", icon: TrendingUp },
    { label: "API & Docs", path: "/docs", icon: Shield },
  ];

  const handleLogout = async () => {
    setUserDropdown(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-[#282828]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark with user's official avatar */}
        <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#1ed760]/40 shadow-lg shadow-[#1ed760]/20 group-hover:scale-105 transition-transform bg-black flex items-center justify-center">
            <img
              src="https://url.bmbxmd.workers.dev/2AFIV.jpg"
              alt="Stany Nexus Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-[#1ed760] transition-colors">
              STANY <span className="text-[#1ed760]">NEXUS</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono -mt-0.5 hidden sm:inline">1 SQ = 100 TSh</span>
          </div>
        </Link>

        {/* Zone 2: Navigation Links (Spotify dark style) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "text-black bg-[#1ed760] shadow-sm"
                    : "text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-black" : "text-zinc-400"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Auth */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Search Shortcut */}
          <Link
            to="/games"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition"
            title="Search games, movies, and services"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Search catalog...</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* SQ Wallet Badge */}
              <Link
                to="/topup"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold tabular-nums transition"
              >
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>{user.txCoins ?? 0} SQ</span>
              </Link>

              {/* User Menu Trigger */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition text-xs font-medium text-zinc-200"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-[10px]">
                    {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="max-w-[80px] sm:max-w-[110px] truncate hidden sm:inline">
                    {user.username || user.email}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {/* Dropdown */}
                {userDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0f1219] border border-border/80 shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1"
                    onClick={() => setUserDropdown(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-border/60">
                      <p className="text-xs font-semibold text-white truncate">{user.username || "Account"}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Dashboard
                    </Link>

                    <Link
                      to="/topup"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      SQ Wallet & Top Up
                    </Link>

                    <Link
                      to="/history"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Transaction History
                    </Link>

                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      Account Settings
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-3.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 font-medium border-t border-border/40"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Admin Console
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 border-t border-border/40 text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Spotify Dark Aesthetics) */}
      {mobileOpen && (
        <div className="md:hidden bg-[#181818] border-b border-[#282828] px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2">
          {/* Rate Notice on Mobile */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#121212] border border-[#282828] text-xs">
            <span className="text-zinc-400">Exchange Rate:</span>
            <span className="font-bold text-[#1ed760] font-mono">1 SQ = 100 TSh</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#1ed760] text-black font-bold shadow-md shadow-[#1ed760]/20"
                      : "bg-[#121212] text-zinc-200 hover:text-white hover:bg-[#242424] border border-[#282828]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-[#1ed760]"}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-[#282828] pt-3 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-white bg-[#121212] border border-[#282828]"
                >
                  <Layers className="w-4 h-4 text-[#1ed760]" />
                  Dashboard
                </Link>
                <Link
                  to="/topup"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-[#1ed760] bg-[#1ed760]/10 border border-[#1ed760]/30"
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#1ed760]" />
                    <span>SQ Wallet (Top Up)</span>
                  </div>
                  <span className="font-bold tabular-nums font-mono">{user?.txCoins ?? 0} SQ</span>
                </Link>
                <Link
                  to="/api-keys"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-300 bg-[#121212] border border-[#282828]"
                >
                  <Shield className="w-4 h-4 text-[#1ed760]" />
                  Developer API Keys
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-[#1ed760] bg-[#121212] border border-[#1ed760]/40"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Console
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-semibold text-white bg-[#121212] border border-[#282828] rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-bold text-black bg-[#1ed760] rounded-lg shadow-md shadow-[#1ed760]/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
