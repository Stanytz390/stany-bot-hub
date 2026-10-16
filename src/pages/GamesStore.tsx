import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { AppShell } from "@/components/AppShell";
import { getGames, getMyGamesLibrary, purchaseGame } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Game, GamePurchaseItem } from "@/types";
import {
  Gamepad2,
  Search,
  Star,
  Coins,
  Download,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  Filter,
  CheckCircle,
  Play,
  Library,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function GamesStore() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activePlatform, setActivePlatform] = useState("All");
  const [sortBy, setSortBy] = useState("featured");

  const [myLibrary, setMyLibrary] = useState<GamePurchaseItem[]>([]);
  const [showLibraryOnly, setShowLibraryOnly] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedGameForPurchase, setSelectedGameForPurchase] = useState<Game | null>(null);

  useEffect(() => {
    loadGames();
    if (user) {
      loadMyLibrary();
    }
  }, [activeCategory, activePlatform, sortBy, user]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const res = await getGames({
        category: activeCategory !== "All" ? activeCategory : undefined,
        platform: activePlatform !== "All" ? activePlatform : undefined,
        sort: sortBy,
        q: search || undefined,
      });
      setGames(res.games || []);
      setCategories(["All", ...(res.categories || [])]);
    } catch {
      toast("Could not load games catalog", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMyLibrary = async () => {
    try {
      const res = await getMyGamesLibrary();
      setMyLibrary(res.items || []);
    } catch {
      // silent
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGames();
  };

  const handlePurchase = async (game: Game) => {
    if (!user) {
      toast("Please sign in to purchase games with your SQ wallet", "info");
      navigate("/login");
      return;
    }

    const discount = game.discount || 0;
    const finalPrice = Math.max(0, Math.round(game.priceSQ * (1 - discount / 100)));

    if (user.txCoins < finalPrice) {
      toast(
        `Insufficient balance. You need ${finalPrice} SQ (Available: ${user.txCoins} SQ).`,
        "error"
      );
      navigate("/topup");
      return;
    }

    try {
      setPurchasingId(game._id);
      const res = await purchaseGame(game._id);
      toast(res.message || `Purchased ${game.title} successfully!`, "success");
      setSelectedGameForPurchase(null);
      await Promise.all([loadMyLibrary(), refreshUser?.()]);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Purchase failed", "error");
    } finally {
      setPurchasingId(null);
    }
  };

  const isGameOwned = (gameId: string) => {
    return myLibrary.some((item) => item.game?._id === gameId);
  };

  const featuredGame = games.find((g) => g.isFeatured) || games[0];

  return (
    <AppShell title="Games Store" subtitle="Explore, buy, and play top digital titles with SQ Coins">
      {/* FEATURED GAME SPOTLIGHT HERO */}
      {featuredGame && !showLibraryOnly && !search && (
        <section className="relative rounded-2xl overflow-hidden mb-10 border border-border/80 bg-[#0d1017]">
          <div className="absolute inset-0 z-0">
            <img
              src={featuredGame.bannerImage || featuredGame.coverImage}
              alt={featuredGame.title}
              className="w-full h-full object-cover object-center opacity-40 brightness-75 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/60 to-transparent" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-3 tracking-wide uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Featured Premiere Release</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
              {featuredGame.title}
            </h1>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300 my-4">
              <span className="font-medium text-emerald-400">{featuredGame.category}</span>
              <span aria-hidden="true">·</span>
              <span>{featuredGame.platform}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {featuredGame.rating}
              </span>
            </div>

            <p className="text-zinc-300 text-sm sm:text-base line-clamp-3 mb-6 max-w-2xl leading-relaxed">
              {featuredGame.description}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={`/games/${featuredGame.slug}`}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition"
              >
                <ShoppingBag className="w-4 h-4" />
                View & Buy
                <ArrowRight className="w-4 h-4" />
              </Link>

              {featuredGame.trailerUrl && (
                <a
                  href={featuredGame.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-white font-medium text-sm flex items-center gap-2 border border-zinc-700/80 backdrop-blur-sm transition"
                >
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  Watch Trailer
                </a>
              )}

              <div className="ml-auto text-right">
                <p className="text-xs text-zinc-400">Store Price</p>
                <p className="text-lg sm:text-xl font-bold text-white tabular-nums">
                  {featuredGame.priceTZS.toLocaleString()} TZS{" "}
                  <span className="text-emerald-400 text-sm">/ {featuredGame.priceSQ} SQ</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FILTER & DISCOVERY BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by title, genre, keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d1017] border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 transition"
          />
        </form>

        {/* View Switcher: Store vs Library */}
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setShowLibraryOnly(!showLibraryOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                showLibraryOnly
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                  : "bg-[#0d1017] border-border/80 text-zinc-300 hover:text-white"
              }`}
            >
              <Library className="w-3.5 h-3.5 text-emerald-400" />
              <span>My Games ({myLibrary.length})</span>
            </button>
          )}

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0d1017] border border-border/80 rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus:border-emerald-500/80"
          >
            <option value="featured">Featured First</option>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* CATEGORY TABS (Interactive Filter Controls) */}
      {!showLibraryOnly && categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                activeCategory === cat
                  ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20"
                  : "bg-[#0d1017] border border-border/60 text-zinc-400 hover:text-white hover:border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* USER'S LIBRARY VIEW */}
      {showLibraryOnly ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-emerald-400" />
              Your Owned Games
            </h2>
            <button
              onClick={() => setShowLibraryOnly(false)}
              className="text-xs text-emerald-400 hover:underline"
            >
              Back to Store Catalog
            </button>
          </div>

          {myLibrary.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0d1017] border border-border/80">
              <Gamepad2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No games in your library yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Discover thrilling digital titles in the store and purchase them using your SQ wallet.
              </p>
              <button
                onClick={() => setShowLibraryOnly(false)}
                className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition"
              >
                Browse Store
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {myLibrary.map(({ game, purchaseId, purchasedAt, priceSQ }) => {
                if (!game) return null;
                return (
                  <div
                    key={purchaseId}
                    className="rounded-2xl bg-[#0d1017] border border-border/80 overflow-hidden flex flex-col group hover:border-emerald-500/40 transition"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-zinc-900">
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-emerald-500 text-black font-bold text-[10px] flex items-center gap-1 shadow-md">
                        <CheckCircle className="w-3 h-3" />
                        Owned
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                          <span>{game.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{game.platform}</span>
                        </div>
                        <h3 className="font-semibold text-white text-base truncate">{game.title}</h3>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Acquired {new Date(purchasedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
                        {game.downloadUrl ? (
                          <a
                            href={game.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        ) : game.externalStoreUrl ? (
                          <a
                            href={game.externalStoreUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Official Store
                          </a>
                        ) : (
                          <span className="flex-1 text-center py-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg">
                            Ready to Play
                          </span>
                        )}
                        <Link
                          to={`/games/${game.slug}`}
                          className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STORE CATALOG GRID */
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[#0d1017] border border-border/80 overflow-hidden animate-pulse"
                >
                  <div className="aspect-[3/4] bg-zinc-900" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    <div className="h-8 bg-zinc-800 rounded mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0d1017] border border-border/80">
              <Gamepad2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No games match your search criteria</h3>
              <p className="text-xs text-zinc-400 mt-1">Try clearing filters or search terms.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                  setActivePlatform("All");
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-zinc-800 text-xs text-white hover:bg-zinc-700"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {games.map((game) => {
                const owned = isGameOwned(game._id);
                const discount = game.discount || 0;
                const finalSQ = Math.max(0, Math.round(game.priceSQ * (1 - discount / 100)));

                return (
                  <div
                    key={game._id}
                    className="rounded-2xl bg-[#0d1017] border border-border/80 overflow-hidden flex flex-col group hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200"
                  >
                    {/* Cover Art (3:4 ratio) */}
                    <Link to={`/games/${game.slug}`} className="aspect-[3/4] relative overflow-hidden bg-zinc-900 block">
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                      {/* Discount Badge */}
                      {discount > 0 && (
                        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-emerald-500 text-black font-extrabold text-[11px] shadow-lg">
                          -{discount}%
                        </div>
                      )}

                      {/* Owned badge */}
                      {owned && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-zinc-900/90 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center gap-1 shadow-lg">
                          <CheckCircle className="w-3 h-3" />
                          In Library
                        </div>
                      )}

                      {/* Bottom Info overlay */}
                      <div className="absolute bottom-3 inset-x-3 text-white">
                        <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
                          <span className="truncate max-w-[140px] text-zinc-400">{game.category}</span>
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

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="truncate">{game.platform}</span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-white tabular-nums">
                              {finalSQ} SQ
                            </span>
                            {discount > 0 && (
                              <span className="text-xs text-zinc-500 line-through tabular-nums">
                                {game.priceSQ} SQ
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-500 tabular-nums">
                            {game.priceTZS.toLocaleString()} TZS
                          </span>
                        </div>

                        {owned ? (
                          <Link
                            to={`/games/${game.slug}`}
                            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                          >
                            Play
                          </Link>
                        ) : (
                          <button
                            onClick={() => setSelectedGameForPurchase(game)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
                          >
                            Get Game
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PURCHASE CONFIRMATION MODAL */}
      {selectedGameForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f121a] border border-border/80 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">Confirm Game Purchase</h3>
            <p className="text-xs text-zinc-400 mb-4">
              You are about to purchase and unlock permanent library access for this game.
            </p>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 mb-5">
              <img
                src={selectedGameForPurchase.coverImage}
                alt={selectedGameForPurchase.title}
                className="w-14 h-18 object-cover rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-white text-sm truncate">
                  {selectedGameForPurchase.title}
                </h4>
                <p className="text-xs text-zinc-400">{selectedGameForPurchase.category}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-emerald-400 font-bold text-sm">
                    {Math.max(
                      0,
                      Math.round(
                        selectedGameForPurchase.priceSQ *
                          (1 - (selectedGameForPurchase.discount || 0) / 100)
                      )
                    )}{" "}
                    SQ
                  </span>
                  <span className="text-zinc-500 text-xs">
                    ({selectedGameForPurchase.priceTZS.toLocaleString()} TZS)
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 py-3 border-y border-border/60 mb-5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Your Available SQ:</span>
                <span className="text-white font-semibold tabular-nums">{user?.txCoins ?? 0} SQ</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Price Deduction:</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  -
                  {Math.max(
                    0,
                    Math.round(
                      selectedGameForPurchase.priceSQ *
                        (1 - (selectedGameForPurchase.discount || 0) / 100)
                    )
                  )}{" "}
                  SQ
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-1 border-t border-border/40 font-bold">
                <span>Remaining Balance:</span>
                <span className="text-white tabular-nums">
                  {(user?.txCoins ?? 0) -
                    Math.max(
                      0,
                      Math.round(
                        selectedGameForPurchase.priceSQ *
                          (1 - (selectedGameForPurchase.discount || 0) / 100)
                      )
                    )}{" "}
                  SQ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedGameForPurchase(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePurchase(selectedGameForPurchase)}
                disabled={purchasingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                {purchasingId ? "Processing..." : "Confirm & Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
