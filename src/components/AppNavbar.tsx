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
  Sparkles,
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
  ];

  const handleLogout = async () => {
    setUserDropdown(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090b10]/95 backdrop-blur-md border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <span className="font-display font-extrabold text-black text-lg">N</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              STANY <span className="text-emerald-400">NEXUS</span>
            </span>
          </div>
        </Link>

        {/* Zone 2: Navigation Links (Single-line, 4-5 items) */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-emerald-400 bg-emerald-500/10 font-semibold"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
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

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0d1017] border-b border-border/80 px-4 pt-2 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-2 pt-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                      : "bg-zinc-900/60 text-zinc-300 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border/60 pt-3 flex flex-col gap-2">
            <Link
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 bg-zinc-900/50"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              User Dashboard
            </Link>
            <Link
              to="/topup"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>SQ Wallet</span>
              </div>
              <span className="font-bold tabular-nums">{user?.txCoins ?? 0} SQ</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-emerald-400 bg-zinc-900/50"
              >
                <Shield className="w-4 h-4" />
                Admin Console
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
