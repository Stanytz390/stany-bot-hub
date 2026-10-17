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

  return (
    <AppShell showNavbar={true}>
      {/* AUTHENTICATED USER GREETING & SQ BALANCE STRIP */}
      {user && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0d1017] to-[#0d1017] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              {user.username ? user.username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-semibold">Welcome back</p>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {user.username || user.email}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-right">
              <span className="text-[11px] text-zinc-400 block">Available Balance</span>
              <span className="text-base font-extrabold text-emerald-400 tabular-nums">
                {user.txCoins ?? 0} SQ
              </span>
            </div>
            <Link
              to="/topup"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
            >
              Top Up SQ
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* CINEMATIC HERO SPOTLIGHT */}
      <section className="relative rounded-3xl overflow-hidden mb-14 border border-border/80 bg-[#0a0d14] shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_nexus_cinematic_1792182319804.jpg"
            alt="Stany Host Nexus Entertainment Universe"
            className="w-full h-full object-cover object-center brightness-70 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/50 to-transparent" />
        </div>

        <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-20 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Digital Entertainment & Cloud Infrastructure</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-[1.1]">
            Next-Gen Entertainment & <span className="text-emerald-400">Hosting Nexus</span>
          </h1>

          <p className="mt-4 text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Stream premier cinema, unlock premium PC and mobile games, deploy instant WhatsApp bots,
            and scale high-performance game servers — powered by the unified SQ digital wallet.
          </p>

          {/* GLOBAL HERO SEARCH */}
          <form onSubmit={handleSearch} className="mt-8 relative max-w-xl">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search across games, movies, hosting & bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1017]/90 backdrop-blur-md border border-border/80 rounded-2xl pl-12 pr-28 py-3.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition shadow-xl"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 transition"
            >
              Search
            </button>
          </form>

          {/* HERO QUICK CTAS */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/games"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition"
            >
              <Gamepad2 className="w-4 h-4" />
              Explore Games Store
            </Link>
            <Link
              to="/movies"
              className="px-6 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-white font-semibold text-sm flex items-center gap-2 border border-zinc-700/80 transition"
            >
              <Film className="w-4 h-4 text-emerald-400" />
              Watch Movies
            </Link>
            <Link
              to="/services/bots"
              className="px-6 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-sm flex items-center gap-2 border border-zinc-700/80 transition"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              Deploy Bots
            </Link>
          </div>
        </div>
      </section>

      {/* TRENDING GAMES SHELF */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              Digital Storefront
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2 mt-0.5">
              <Gamepad2 className="w-5 h-5 text-emerald-400" />
              Trending Games
            </h2>
          </div>
          <Link
            to="/games"
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <span>View All Games</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-[#0d1017] border border-border/80 overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-zinc-900" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : (
            games.slice(0, 4).map((game) => {
            const discount = game.discount || 0;
            const finalSQ = Math.max(0, Math.round(game.priceSQ * (1 - discount / 100)));
            return (
              <div
                key={game._id}
                className="rounded-2xl bg-[#0d1017] border border-border/80 overflow-hidden flex flex-col group hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200"
              >
                <Link to={`/games/${game.slug}`} className="aspect-[3/4] relative overflow-hidden bg-zinc-900 block">
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-emerald-500 text-black font-extrabold text-[11px] shadow-lg">
                      -{discount}%
                    </div>
                  )}
                  <div className="absolute bottom-3 inset-x-3 text-white">
                    <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
                      <span className="truncate text-zinc-400">{game.category}</span>
                      <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {game.rating}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white leading-tight truncate">
                      {game.title}
                    </h3>
                  </div>
                </Link>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-zinc-400 truncate">{game.platform}</div>
                  <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-white tabular-nums">{finalSQ} SQ</span>
                      <span className="block text-[11px] text-zinc-500 tabular-nums">
                        {game.priceTZS.toLocaleString()} TZS
                      </span>
                    </div>
                    <Link
                      to={`/games/${game.slug}`}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition"
                    >
                      Get Game
                    </Link>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </section>

      {/* FEATURED MOVIES SHELF */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              Cinema Stream
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2 mt-0.5">
              <Film className="w-5 h-5 text-emerald-400" />
              Featured Cinema Releases
            </h2>
          </div>
          <Link
            to="/movies"
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <span>View All Films</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {movies.slice(0, 4).map((movie) => {
            const discount = movie.discount || 0;
            const finalSQ = Math.max(0, Math.round(movie.priceSQ * (1 - discount / 100)));
            return (
              <div
                key={movie._id}
                className="rounded-2xl bg-[#0d1017] border border-border/80 overflow-hidden flex flex-col group hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200"
              >
                <Link to={`/movies/${movie.slug}`} className="aspect-[3/4] relative overflow-hidden bg-zinc-900 block">
                  <img
                    src={movie.posterImage}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 inset-x-3 text-white">
                    <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
                      <span className="truncate text-zinc-400">{movie.genre.split(",")[0]}</span>
                      <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {movie.rating}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white leading-tight truncate">
                      {movie.title}
                    </h3>
                  </div>
                </Link>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{movie.releaseYear}</span>
                    <span aria-hidden="true">·</span>
                    <span>{movie.duration}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-white tabular-nums">{finalSQ} SQ</span>
                      <span className="block text-[11px] text-zinc-500 tabular-nums">
                        {movie.priceTZS.toLocaleString()} TZS
                      </span>
                    </div>
                    <Link
                      to={`/movies/${movie.slug}`}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Watch
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOSTING & BOT AUTOMATION SERVICES SPOTLIGHT */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              Cloud Infrastructure
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2 mt-0.5">
              <Server className="w-5 h-5 text-emerald-400" />
              Hosting & Automation Services
            </h2>
          </div>
          <Link
            to="/hosting"
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <span>All Services</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Pterodactyl Game & Bot Panels */}
          <div className="rounded-2xl bg-[#0d1017] border border-border/80 p-6 flex flex-col justify-between hover:border-emerald-500/40 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">High-Speed Panel Hosting</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Pterodactyl hosting environments with dedicated RAM, NVMe disk, and sub-second
                command consoles. Perfect for 24/7 bots and services.
              </p>
              <div className="space-y-1.5 text-xs text-zinc-300 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant automated provisioning</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {panelPlans.length > 0
                      ? `From ${panelPlans[0].txCost} SQ (~${(panelPlans[0].txCost * 1000).toLocaleString()} TZS) / month`
                      : "From 5 SQ (~5,000 TZS) / month"}
                  </span>
                </div>
              </div>
            </div>
            <Link
              to="/services/panels/purchasepanel"
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs border border-zinc-700/80 flex items-center justify-center gap-2 transition"
            >
              Order Panel Plan
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: WhatsApp Bot Deployment */}
          <div className="rounded-2xl bg-[#0d1017] border border-border/80 p-6 flex flex-col justify-between hover:border-emerald-500/40 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">WhatsApp Bots & Automation</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Deploy ready-to-run WhatsApp automation bots (
                {botTemplates.length > 0
                  ? botTemplates.map((b) => b.name).join(", ")
                  : "MdinyaneV2, SubZero, Queen Anita"}
                ) with one click. Pair with QR or phone code.
              </p>
              <div className="space-y-1.5 text-xs text-zinc-300 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero code required deployment</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Free trials & budget packages</span>
                </div>
              </div>
            </div>
            <Link
              to="/services/bots"
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs border border-zinc-700/80 flex items-center justify-center gap-2 transition"
            >
              Deploy a Bot
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: SMM & Website Hosting */}
          <div className="rounded-2xl bg-[#0d1017] border border-border/80 p-6 flex flex-col justify-between hover:border-emerald-500/40 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">SMM Growth & Custom Domains</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Fast-track your social presence with instant Telegram, TikTok, and WhatsApp channel
                boosters, or deploy full websites with custom domains.
              </p>
              <div className="space-y-1.5 text-xs text-zinc-300 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-time order tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Automated fulfillment</span>
                </div>
              </div>
            </div>
            <Link
              to="/smm"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition"
            >
              Boost Engagement
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* PROMOTIONAL & TRUST BANNER */}
      <section className="mb-14 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-[#0d1017] border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Safe & Instant Payments
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Top Up with Mobile Money (M-Pesa, Tigo, Airtel)
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl">
            Convert Tanzanian Shillings into SQ Coins in seconds. Automated STK push verification,
            transparent rates, zero hidden fees.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/topup"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition"
          >
            Deposit & Top Up
          </Link>
          <Link
            to="/docs"
            className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold border border-zinc-800 transition"
          >
            How it Works
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-10 border-t border-border/60 text-zinc-400 text-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Entertainment</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/games" className="hover:text-emerald-400 transition">
                  Games Store
                </Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-emerald-400 transition">
                  Movies Cinema
                </Link>
              </li>
              <li>
                <Link to="/games?sort=rating" className="hover:text-emerald-400 transition">
                  Top Rated Titles
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-3">Hosting & Cloud</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/services/panels" className="hover:text-emerald-400 transition">
                  Pterodactyl Panels
                </Link>
              </li>
              <li>
                <Link to="/services/bots" className="hover:text-emerald-400 transition">
                  WhatsApp Bot Deploy
                </Link>
              </li>
              <li>
                <Link to="/linkbot" className="hover:text-emerald-400 transition">
                  Linked WhatsApp Bot
                </Link>
              </li>
              <li>
                <Link to="/hosting" className="hover:text-emerald-400 transition">
                  Web Hosting
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-3">Wallet & SMM</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/topup" className="hover:text-emerald-400 transition">
                  SQ Coins Top Up
                </Link>
              </li>
              <li>
                <Link to="/smm" className="hover:text-emerald-400 transition">
                  SMM Social Growth
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-emerald-400 transition">
                  Transaction History
                </Link>
              </li>
              <li>
                <Link to="/send-coins" className="hover:text-emerald-400 transition">
                  Transfer SQ Coins
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-3">Support & Community</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/community" className="hover:text-emerald-400 transition">
                  Community Chat
                </Link>
              </li>
              <li>
                <Link to="/tutorials" className="hover:text-emerald-400 transition">
                  Video Tutorials
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-emerald-400 transition">
                  Documentation & API
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-400 transition">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <p>© {new Date().getFullYear()} Stany Host Nexus. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span>Powered by SQ Digital Economy</span>
            <span>·</span>
            <span>Fast, Reliable, High Performance</span>
          </p>
        </div>
      </footer>
    </AppShell>
  );
}
