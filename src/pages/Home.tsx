import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { getGames, getMovies, getPanelPlans, getBotTemplates } from "@/lib/api";
import type { Game, Movie, PanelPlan, BotTemplate } from "@/types";
import {
  Gamepad2,
  Film,
  Server,
  Bot,
  Search,
  Sparkles,
  ArrowRight,
  Star,
  CheckCircle,
  Play,
  TrendingUp,
  ChevronRight,
  Shield,
  Layers,
  Coins,
  Code2,
  Copy,
  Check,
  Globe,
  Terminal,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [panelPlans, setPanelPlans] = useState<PanelPlan[]>([]);
  const [botTemplates, setBotTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedApi, setCopiedApi] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const [gamesRes, moviesRes, panelsRes, botsRes] = await Promise.allSettled([
          getGames({ limit: 8, sort: "featured" }),
          getMovies({ limit: 8, sort: "featured" }),
          getPanelPlans(),
          getBotTemplates(),
        ]);

        if (gamesRes.status === "fulfilled" && gamesRes.value?.games) {
          setGames(gamesRes.value.games);
        }
        if (moviesRes.status === "fulfilled" && moviesRes.value?.movies) {
          setMovies(moviesRes.value.movies);
        }
        if (panelsRes.status === "fulfilled" && Array.isArray(panelsRes.value)) {
          setPanelPlans(panelsRes.value.slice(0, 3));
        }
        if (botsRes.status === "fulfilled" && Array.isArray(botsRes.value)) {
          setBotTemplates(botsRes.value.slice(0, 4));
        }
      } catch {
        // silent fallback
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/games?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(
      'curl -X GET "https://host.stanymaxhub.online/api/v1/user" -H "Authorization: Bearer YOUR_API_KEY"'
    );
    setCopiedApi(true);
    setTimeout(() => setCopiedApi(false), 2000);
  };

  return (
    <AppShell showNavbar={true}>
      {/* 1. TOP RATE ANNOUNCEMENT TICKER (SPOTIFY STYLE) */}
      <div className="mb-6 px-3.5 py-2.5 rounded-xl bg-[#181818] border border-[#282828] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse shrink-0" />
          <span className="text-zinc-300">
            Official Currency Rate:{" "}
            <strong className="text-[#1ed760] font-mono font-bold text-sm">1 SQ = 100 TSh</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span>M-Pesa · TigoPesa · Airtel · HaloPesa</span>
          <span aria-hidden="true">·</span>
          <Link to="/topup" className="text-[#1ed760] hover:underline font-semibold">
            Top Up Wallet &rarr;
          </Link>
        </div>
      </div>

      {/* 2. AUTHENTICATED USER COMMAND CENTER (SPOTIFY STYLE) */}
      {user ? (
        <section className="mb-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#181818] via-[#141414] to-[#121212] border border-[#282828] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-[#282828]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#1ed760]/20 border border-[#1ed760]/40 flex items-center justify-center text-[#1ed760] font-extrabold text-lg">
                {user.username ? user.username.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#1ed760] uppercase tracking-wider">
                    Welcome Back
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-zinc-300 font-mono">
                    {user.role || "member"}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {user.username || user.email}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-[#121212] border border-[#282828] text-right">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Your SQ Balance
                </span>
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className="text-xl font-extrabold text-[#1ed760] font-mono tabular-nums">
                    {user.txCoins ?? 0} SQ
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    (~{((user.txCoins ?? 0) * 100).toLocaleString()} TSh)
                  </span>
                </div>
              </div>

              <Link
                to="/topup"
                className="px-4 py-2.5 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs shadow-md shadow-[#1ed760]/20 active:scale-95 transition"
              >
                Top Up Balance
              </Link>
              <Link
                to="/dashboard"
                className="px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#2c2c2c] text-white text-xs font-semibold border border-[#333333] transition"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Quick Shortcuts Grid (Spotify Pill Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-4">
            <Link
              to="/mybots"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121212] hover:bg-[#202020] border border-[#282828] transition group"
            >
              <Bot className="w-4 h-4 text-[#1ed760] group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">My Bots</p>
                <p className="text-[10px] text-zinc-400 truncate">Deploy & Manage</p>
              </div>
            </Link>

            <Link
              to="/mypanels"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121212] hover:bg-[#202020] border border-[#282828] transition group"
            >
              <Server className="w-4 h-4 text-[#1ed760] group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">My Panels</p>
                <p className="text-[10px] text-zinc-400 truncate">Pterodactyl</p>
              </div>
            </Link>

            <Link
              to="/games"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121212] hover:bg-[#202020] border border-[#282828] transition group"
            >
              <Gamepad2 className="w-4 h-4 text-[#1ed760] group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Games Store</p>
                <p className="text-[10px] text-zinc-400 truncate">PC & Android</p>
              </div>
            </Link>

            <Link
              to="/movies"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121212] hover:bg-[#202020] border border-[#282828] transition group"
            >
              <Film className="w-4 h-4 text-[#1ed760] group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Cinema Movies</p>
                <p className="text-[10px] text-zinc-400 truncate">Stream & Watch</p>
              </div>
            </Link>

            <Link
              to="/smm"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121212] hover:bg-[#202020] border border-[#282828] transition group"
            >
              <TrendingUp className="w-4 h-4 text-[#1ed760] group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">SMM Boost</p>
                <p className="text-[10px] text-zinc-400 truncate">Followers & Views</p>
              </div>
            </Link>

            <Link
              to="/docs"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121212] hover:bg-[#202020] border border-[#282828] transition group"
            >
              <Code2 className="w-4 h-4 text-[#1ed760] group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Developer API</p>
                <p className="text-[10px] text-zinc-400 truncate">Docs & SDK</p>
              </div>
            </Link>
          </div>
        </section>
      ) : null}

      {/* 3. SPOTIFY CINEMATIC HERO SPOTLIGHT */}
      <section className="relative rounded-3xl overflow-hidden mb-12 border border-[#282828] bg-[#121212] shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_nexus_cinematic_1792182319804.jpg"
            alt="Stany Host Nexus Universal Entertainment"
            className="w-full h-full object-cover object-center brightness-50 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/60 to-transparent" />
        </div>

        <div className="relative z-10 px-5 py-10 sm:px-10 sm:py-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1ed760]/15 border border-[#1ed760]/30 text-[#1ed760] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stany Host Nexus Platform · 1 SQ = 100 TSh</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-[1.15]">
            Modern <span className="text-[#1ed760]">Cloud Hosting</span>, WhatsApp Bots & Digital Entertainment
          </h1>

          <p className="mt-3.5 text-zinc-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl">
            Welcome to Stany Host Nexus. Instantly host your WhatsApp bots, manage high-performance Pterodactyl Game Panels, buy PC & Android games, stream premier cinema movies, and boost your social networks via SMM — all powered by a unified <strong>SQ Coins</strong> balance.
          </p>

          {/* GLOBAL HERO SEARCH */}
          <form onSubmit={handleSearch} className="mt-6 relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search games, movies, bot templates, or panels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181818]/90 backdrop-blur-md border border-[#333333] rounded-xl pl-10 pr-24 py-3 text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-[#1ed760] transition shadow-lg"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs shadow-md transition"
            >
              Search
            </button>
          </form>

          {/* Quick action buttons for visitors */}
          {!user && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="px-5 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs sm:text-sm shadow-lg shadow-[#1ed760]/20 active:scale-95 transition"
              >
                Create Free Account (+2 SQ)
              </Link>
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full bg-[#181818] hover:bg-[#242424] text-white font-semibold text-xs sm:text-sm border border-[#333333] transition"
              >
                Sign In
              </Link>
              <a
                href="#instructions"
                className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white transition"
              >
                Explore Instructions &darr;
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 4. FULL INSTRUCTIONS / HOW IT WORKS SECTION (SPOTIFY CLEAN CARDING) */}
      <section id="instructions" className="mb-14 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <span className="text-xs font-bold text-[#1ed760] tracking-wider uppercase font-mono">
              Platform Guide
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1">
              How It Works: Step-by-Step
            </h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-sm">
            Follow these 4 simple steps to unlock and use all Stany Host Nexus services.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="rounded-2xl bg-[#181818] border border-[#282828] p-5 flex flex-col justify-between hover:border-[#1ed760]/50 hover:bg-[#202020]/70 transition-all duration-300 group shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] font-extrabold text-xs flex items-center justify-center font-mono">
                    01
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-center text-[#1ed760] group-hover:scale-110 transition-transform">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[11px] text-[#1ed760] font-semibold px-2 py-0.5 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/20">+2 SQ Bonus</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#1ed760] transition-colors">
                1. Register Free Account
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Create your Stany Nexus account in seconds. Once registered and logged in, you gain full access to your dashboard, bots, panels, and digital stores.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#282828]">
              <Link to="/signup" className="text-xs text-[#1ed760] hover:underline font-semibold flex items-center gap-1">
                Create Free Account &rarr;
              </Link>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl bg-[#181818] border border-[#282828] p-5 flex flex-col justify-between hover:border-[#1ed760]/50 hover:bg-[#202020]/70 transition-all duration-300 group shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] font-extrabold text-xs flex items-center justify-center font-mono">
                    02
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-center text-[#1ed760] group-hover:scale-110 transition-transform">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[11px] text-[#1ed760] font-bold font-mono px-2 py-0.5 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/20">1 SQ = 100 TSh</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#1ed760] transition-colors">
                2. Top Up SQ Wallet
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Visit the <strong>Top Up</strong> page. Select your amount (1 SQ = 100 TSh). Pay via M-Pesa, TigoPesa, or Airtel Money with instant automated STK push.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#282828]">
              <Link to="/topup" className="text-xs text-[#1ed760] hover:underline font-semibold flex items-center gap-1">
                Top Up SQ Wallet &rarr;
              </Link>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl bg-[#181818] border border-[#282828] p-5 flex flex-col justify-between hover:border-[#1ed760]/50 hover:bg-[#202020]/70 transition-all duration-300 group shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] font-extrabold text-xs flex items-center justify-center font-mono">
                    03
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-center text-[#1ed760] group-hover:scale-110 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Active 24/7</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#1ed760] transition-colors">
                3. Choose Your Service
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deploy <strong>WhatsApp Bots</strong> (MdinyaneV2, Queen Anita), purchase <strong>Server Panels</strong> (from 5 SQ), buy <strong>PC & Android Games</strong>, or stream movies.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#282828]">
              <Link to="/services/bots" className="text-xs text-[#1ed760] hover:underline font-semibold flex items-center gap-1">
                Browse All Services &rarr;
              </Link>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-2xl bg-[#181818] border border-[#282828] p-5 flex flex-col justify-between hover:border-[#1ed760]/50 hover:bg-[#202020]/70 transition-all duration-300 group shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] font-extrabold text-xs flex items-center justify-center font-mono">
                    04
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-center text-[#1ed760] group-hover:scale-110 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[11px] text-[#1ed760] font-mono px-2 py-0.5 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/20">Global REST API</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#1ed760] transition-colors">
                4. Developer API & Docs
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Developers can use personal <strong>API Keys</strong> to integrate WhatsApp bots, check balances, and automate orders through our official REST API.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#282828]">
              <Link to="/docs" className="text-xs text-[#1ed760] hover:underline font-semibold flex items-center gap-1">
                Read Developer Docs &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SPOTIFY FEATURED GAMES SHELF (HORIZONTAL SWIPE ON MOBILE) */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-xs font-semibold text-[#1ed760] tracking-wider uppercase font-mono">
              Digital Games
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2 mt-0.5">
              <Gamepad2 className="w-5 h-5 text-[#1ed760]" />
              Popular Games Store
            </h2>
          </div>
          <Link
            to="/games"
            className="flex items-center gap-1 text-xs font-bold text-[#1ed760] hover:text-[#1db954] transition"
          >
            <span>Browse All Games</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal scroll container for mobile, responsive grid on desktop */}
        <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto pb-3 scrollbar-none snap-x">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-64 md:w-auto shrink-0 snap-start rounded-2xl bg-[#181818] border border-[#282828] overflow-hidden animate-pulse p-4"
              >
                <div className="aspect-[3/4] bg-[#242424] rounded-xl mb-3" />
                <div className="h-4 bg-[#282828] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#282828] rounded w-1/2" />
              </div>
            ))
          ) : (
            games.slice(0, 4).map((game) => {
              const discount = game.discount || 0;
              const finalSQ = Math.max(0, Math.round(game.priceSQ * (1 - discount / 100)));
              const tzsPrice = finalSQ * 100; // 1 SQ = 100 TSh
              return (
                <div
                  key={game._id}
                  className="w-64 md:w-auto shrink-0 snap-start rounded-2xl bg-[#181818] border border-[#282828] p-3.5 flex flex-col justify-between group hover:bg-[#222222] hover:border-[#333333] transition-all duration-200"
                >
                  <Link to={`/games/${game.slug}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black block">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                    {discount > 0 && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#1ed760] text-black font-extrabold text-[10px] shadow-md">
                        -{discount}%
                      </span>
                    )}

                    {/* Circular Spotify Green Action Button on Hover */}
                    <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#1ed760] text-black shadow-xl shadow-black/80 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 active:scale-95 transition-all">
                      <Play className="w-4 h-4 fill-black translate-x-0.5" />
                    </div>
                  </Link>

                  <div className="pt-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="truncate max-w-[120px]">{game.category}</span>
                        <span className="flex items-center gap-1 text-amber-400 font-semibold font-mono">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {game.rating}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white leading-tight truncate group-hover:text-[#1ed760] transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{game.platform}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#282828] flex items-center justify-between">
                      <div>
                        <span className="text-sm font-extrabold text-[#1ed760] font-mono tabular-nums">
                          {finalSQ} SQ
                        </span>
                        <span className="block text-[10px] text-zinc-400 font-mono">
                          {tzsPrice.toLocaleString()} TSh
                        </span>
                      </div>
                      <Link
                        to={`/games/${game.slug}`}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-[#1ed760] hover:text-black text-white text-xs font-bold transition"
                      >
                        Buy Game
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 6. SPOTIFY FEATURED CINEMA MOVIES SHELF */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-xs font-semibold text-[#1ed760] tracking-wider uppercase font-mono">
              Cinema & Premieres
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2 mt-0.5">
              <Film className="w-5 h-5 text-[#1ed760]" />
              Trending Cinema Movies
            </h2>
          </div>
          <Link
            to="/movies"
            className="flex items-center gap-1 text-xs font-bold text-[#1ed760] hover:text-[#1db954] transition"
          >
            <span>Browse All Movies</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto pb-3 scrollbar-none snap-x">
          {movies.slice(0, 4).map((movie) => {
            const discount = movie.discount || 0;
            const finalSQ = Math.max(0, Math.round(movie.priceSQ * (1 - discount / 100)));
            const tzsPrice = finalSQ * 100; // 1 SQ = 100 TSh
            return (
              <div
                key={movie._id}
                className="w-64 md:w-auto shrink-0 snap-start rounded-2xl bg-[#181818] border border-[#282828] p-3.5 flex flex-col justify-between group hover:bg-[#222222] hover:border-[#333333] transition-all duration-200"
              >
                <Link to={`/movies/${movie.slug}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black block">
                  <img
                    src={movie.posterImage}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                  {/* Circular Spotify Green Play Button */}
                  <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#1ed760] text-black shadow-xl shadow-black/80 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 active:scale-95 transition-all">
                    <Play className="w-4 h-4 fill-black translate-x-0.5" />
                  </div>
                </Link>

                <div className="pt-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                      <span className="truncate max-w-[120px]">{movie.genre.split(",")[0]}</span>
                      <span className="flex items-center gap-1 text-amber-400 font-semibold font-mono">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {movie.rating}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white leading-tight truncate group-hover:text-[#1ed760] transition-colors">
                      {movie.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {movie.releaseYear} · {movie.duration}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#282828] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-[#1ed760] font-mono tabular-nums">
                        {finalSQ} SQ
                      </span>
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        {tzsPrice.toLocaleString()} TSh
                      </span>
                    </div>
                    <Link
                      to={`/movies/${movie.slug}`}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-[#1ed760] hover:text-black text-white text-xs font-bold transition"
                    >
                      Watch
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. CLOUD HOSTING & AUTOMATION SERVICES (SPOTIFY CARDS) */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-xs font-semibold text-[#1ed760] tracking-wider uppercase font-mono">
              Server Infrastructure
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2 mt-0.5">
              <Server className="w-5 h-5 text-[#1ed760]" />
              Panels, WhatsApp Bots & SMM
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Pterodactyl Panels */}
          <div className="rounded-2xl bg-[#181818] border border-[#282828] p-6 flex flex-col justify-between hover:border-[#1ed760]/40 transition group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760] mb-4 group-hover:scale-105 transition-transform">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#1ed760] transition-colors">
                Pterodactyl Game Panels
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Deploy full cloud servers equipped with dedicated RAM, NVMe SSD storage, sub-second web console, and 24/7 guaranteed uptime.
              </p>
              <div className="space-y-2 text-xs text-zinc-300 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Automated instant server provisioning</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span className="font-semibold text-white">
                    {panelPlans.length > 0
                      ? `Starting at ${panelPlans[0].txCost} SQ (${(panelPlans[0].txCost * 100).toLocaleString()} TSh) / mo`
                      : "Starting at 5 SQ (500 TSh) / mo"}
                  </span>
                </div>
              </div>
            </div>
            <Link
              to="/services/panels/purchasepanel"
              className="w-full py-2.5 rounded-full bg-[#121212] hover:bg-[#1ed760] hover:text-black text-white font-bold text-xs border border-[#282828] flex items-center justify-center gap-2 transition"
            >
              Order Panel Now
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: WhatsApp Bot Deployment */}
          <div className="rounded-2xl bg-[#181818] border border-[#282828] p-6 flex flex-col justify-between hover:border-[#1ed760]/40 transition group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760] mb-4 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#1ed760] transition-colors">
                WhatsApp Bot Deployment
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Deploy ready-to-run WhatsApp automation bots (
                {botTemplates.length > 0
                  ? botTemplates.map((b) => b.name).join(", ")
                  : "MdinyaneV2, SubZero, Queen Anita"}
                ) in 1 click. Enter your session string and deploy!
              </p>
              <div className="space-y-2 text-xs text-zinc-300 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Zero code required — Instant setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Runs 24/7 online without keeping your phone on</span>
                </div>
              </div>
            </div>
            <Link
              to="/services/bots"
              className="w-full py-2.5 rounded-full bg-[#121212] hover:bg-[#1ed760] hover:text-black text-white font-bold text-xs border border-[#282828] flex items-center justify-center gap-2 transition"
            >
              Deploy WhatsApp Bot
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: SMM & Web Hosting */}
          <div className="rounded-2xl bg-[#181818] border border-[#282828] p-6 flex flex-col justify-between hover:border-[#1ed760]/40 transition group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760] mb-4 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#1ed760] transition-colors">
                SMM Growth & Website Hosting
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Grow your social brand: Telegram channel members, TikTok views & likes, and WhatsApp followers at competitive SQ rates.
              </p>
              <div className="space-y-2 text-xs text-zinc-300 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Fast automated order fulfillment</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Web Hosting and custom domains</span>
                </div>
              </div>
            </div>
            <Link
              to="/smm"
              className="w-full py-2.5 rounded-full bg-[#121212] hover:bg-[#1ed760] hover:text-black text-white font-bold text-xs border border-[#282828] flex items-center justify-center gap-2 transition"
            >
              Boost Social Presence
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. DEVELOPER API & SDK INTEGRATION SECTION */}
      <section className="mb-14 p-6 sm:p-8 rounded-2xl bg-[#181818] border border-[#282828] relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] text-xs font-semibold mb-3">
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer REST API v1 & SDK</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              Integrate Your Systems with Stany Nexus API
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2.5 leading-relaxed">
              Manage accounts, deploy WhatsApp bots from external applications, retrieve game panels, and execute SQ transactions through our secure REST endpoints.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/docs"
                className="px-5 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs shadow-md transition"
              >
                Open Full Documentation
              </Link>
              <Link
                to="/api-keys"
                className="px-4 py-2.5 rounded-full bg-[#121212] hover:bg-[#202020] text-white text-xs font-semibold border border-[#282828] transition"
              >
                Generate API Key
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl bg-[#101216] border border-[#282828] p-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#282828] text-zinc-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#1ed760]" />
                <span className="text-[11px]">Quick API Call</span>
              </div>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 text-[11px] hover:text-white transition"
              >
                {copiedApi ? <Check className="w-3.5 h-3.5 text-[#1ed760]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedApi ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-zinc-500 text-[11px] mb-1"># Check SQ Wallet balance via cURL:</p>
            <div className="text-emerald-400 break-all leading-relaxed">
              curl -X GET &quot;https://host.stanymaxhub.online/api/v1/user&quot; \<br />
              &nbsp;&nbsp;-H &quot;Authorization: Bearer YOUR_API_KEY&quot;
            </div>
          </div>
        </div>
      </section>

      {/* 9. PROMOTIONAL TRUST BANNER (1 SQ = 100 TSH) */}
      <section className="mb-14 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#181818] to-[#141414] border border-[#282828] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-[#1ed760] font-mono tracking-wider uppercase">
            Instant & Trusted Payments (Tanzania & Global)
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Top Up SQ Wallet via Mobile Money (M-Pesa, Tigo, Airtel)
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl">
            1 SQ = 100 TSh. Direct STK push to your phone. Automated verification within 3 seconds with zero hidden charges.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/topup"
            className="px-6 py-3 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-sm shadow-lg shadow-[#1ed760]/20 active:scale-95 transition"
          >
            Top Up Now
          </Link>
          <Link
            to="/docs"
            className="px-5 py-3 rounded-full bg-[#121212] hover:bg-[#202020] text-zinc-200 text-sm font-semibold border border-[#282828] transition"
          >
            Payment Guide
          </Link>
        </div>
      </section>

      {/* 10. SPOTIFY CLEAN FOOTER */}
      <footer className="pt-10 border-t border-[#282828] text-zinc-400 text-xs pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Entertainment</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/games" className="hover:text-[#1ed760] transition">
                  Games Store
                </Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-[#1ed760] transition">
                  Movies Cinema
                </Link>
              </li>
              <li>
                <Link to="/games?sort=rating" className="hover:text-[#1ed760] transition">
                  Top Rated Games
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-3">Hosting & Cloud</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/services/panels" className="hover:text-[#1ed760] transition">
                  Pterodactyl Panels
                </Link>
              </li>
              <li>
                <Link to="/services/bots" className="hover:text-[#1ed760] transition">
                  WhatsApp Bot Deploy
                </Link>
              </li>
              <li>
                <Link to="/linkbot" className="hover:text-[#1ed760] transition">
                  Linked WhatsApp Bot
                </Link>
              </li>
              <li>
                <Link to="/hosting" className="hover:text-[#1ed760] transition">
                  Web Hosting
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-3">Wallet & Rates</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/topup" className="hover:text-[#1ed760] transition font-semibold text-white">
                  Top Up (1 SQ = 100 TSh)
                </Link>
              </li>
              <li>
                <Link to="/smm" className="hover:text-[#1ed760] transition">
                  SMM Social Growth
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-[#1ed760] transition">
                  Transaction History
                </Link>
              </li>
              <li>
                <Link to="/send-coins" className="hover:text-[#1ed760] transition">
                  Transfer SQ Coins
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-3">Developers & Support</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/docs" className="hover:text-[#1ed760] transition">
                  Developer Documentation
                </Link>
              </li>
              <li>
                <Link to="/api-keys" className="hover:text-[#1ed760] transition">
                  API Key Management
                </Link>
              </li>
              <li>
                <Link to="/community" className="hover:text-[#1ed760] transition">
                  Community Chat
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#1ed760] transition">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#282828] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <p>© {new Date().getFullYear()} Stany Host Nexus. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span className="font-mono text-[#1ed760] font-bold">1 SQ = 100 TSh</span>
            <span>·</span>
            <span>Fast, Reliable, High Performance</span>
          </p>
        </div>
      </footer>
    </AppShell>
  );
}
