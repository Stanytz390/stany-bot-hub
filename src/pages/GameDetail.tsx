import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { AppShell } from "@/components/AppShell";
import { getGameBySlug, purchaseGame } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Game } from "@/types";
import {
  Star,
  Download,
  ExternalLink,
  Play,
  CheckCircle,
  ShoppingBag,
} from "lucide-react";

export default function GameDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [related, setRelated] = useState<Game[]>([]);
  const [isOwned, setIsOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"trailer" | "screenshots">("trailer");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const loadGame = async (gameSlug: string) => {
    try {
      setLoading(true);
      const res = await getGameBySlug(gameSlug);
      setGame(res.game);
      setRelated(res.related || []);
      setIsOwned(res.isOwned || false);
      if (res.game?.screenshots?.length) {
        setSelectedScreenshot(res.game.screenshots[0]);
      }
    } catch {
      showToast("Could not find the requested game", "error");
      navigate("/games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      loadGame(slug);
    }
  }, [slug]);

  const handlePurchase = async () => {
    if (!game) return;
    if (!user) {
      showToast("Please sign in to buy games with your SQ coins", "info");
      navigate("/login");
      return;
    }

    const discount = game.discount || 0;
    const finalPrice = Math.max(0, Math.round(game.priceSQ * (1 - discount / 100)));

    if (user.txCoins < finalPrice) {
      showToast(
        `Insufficient balance. You need ${finalPrice} SQ (Available: ${user.txCoins} SQ).`,
        "error"
      );
      navigate("/topup");
      return;
    }

    try {
      setPurchasing(true);
      const res = await purchaseGame(game._id);
      showToast(res.message || "Game successfully unlocked!", "success");
      setIsOwned(true);
      await refreshUser?.();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Purchase failed", "error");
    } finally {
      setPurchasing(false);
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  if (loading) {
    return (
      <AppShell title="Loading Game...">
        <div className="max-w-6xl mx-auto py-12 animate-pulse space-y-6">
          <div className="h-72 bg-zinc-900 rounded-2xl" />
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-4 bg-zinc-800 rounded w-2/3" />
        </div>
      </AppShell>
    );
  }

  if (!game) return null;

  const discount = game.discount || 0;
  const finalSQ = Math.max(0, Math.round(game.priceSQ * (1 - discount / 100)));
  const embedTrailer = game.trailerUrl ? getYoutubeEmbedUrl(game.trailerUrl) : null;

  return (
    <AppShell title={game.title} subtitle={`${game.category} · ${game.platform}`}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* TOP HERO MEDIA & CONTIGUOUS PURCHASE MODULE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: MEDIA DISPLAY (Trailer / Screenshots) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-black border border-border/80 shadow-2xl">
              {activeMediaTab === "trailer" && embedTrailer ? (
                <iframe
                  src={embedTrailer}
                  title={`${game.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <img
                  src={selectedScreenshot || game.bannerImage || game.coverImage}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Media Thumbnails & Selector */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {embedTrailer && (
                <button
                  onClick={() => setActiveMediaTab("trailer")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeMediaTab === "trailer"
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                      : "bg-[#0d1017] border border-border/80 text-zinc-300 hover:text-white"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Official Trailer
                </button>
              )}

              {game.screenshots?.map((scr, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveMediaTab("screenshots");
                    setSelectedScreenshot(scr);
                  }}
                  className={`w-20 h-12 rounded-lg overflow-hidden border shrink-0 transition ${
                    activeMediaTab === "screenshots" && selectedScreenshot === scr
                      ? "border-emerald-400 ring-2 ring-emerald-400/40"
                      : "border-border/80 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={scr} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: CONTIGUOUS PURCHASE MODULE */}
          <div className="lg:col-span-4 rounded-2xl bg-[#0d1017] border border-border/80 p-6 space-y-6">
            <div className="flex items-start gap-4">
              <img
                src={game.coverImage}
                alt={game.title}
                className="w-20 h-28 object-cover rounded-xl shadow-md border border-border/80 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-emerald-400 font-semibold">{game.category}</span>
                <h2 className="text-lg font-bold text-white leading-snug line-clamp-2 mt-0.5">
                  {game.title}
                </h2>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mt-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{game.rating} / 5.0 Community Score</span>
                </div>
              </div>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-zinc-400">Digital Edition Price</span>
                {discount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                    SAVE {discount}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-white tabular-nums">{finalSQ} SQ</span>
                {discount > 0 && (
                  <span className="text-sm text-zinc-500 line-through tabular-nums">
                    {game.priceSQ} SQ
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                Tanzanian Shillings: {game.priceTZS.toLocaleString()} TZS
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-3">
              {isOwned ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Unlocked in your library</span>
                  </div>

                  {game.downloadUrl ? (
                    <a
                      href={game.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download Game Files
                    </a>
                  ) : game.externalStoreUrl ? (
                    <a
                      href={game.externalStoreUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      Open Official Store Page
                    </a>
                  ) : null}
                </div>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {purchasing ? "Processing..." : `Buy Now for ${finalSQ} SQ`}
                </button>
              )}

              {user && (
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1 pt-1">
                  <span>Your SQ Coins:</span>
                  <span className="text-white font-semibold tabular-nums">{user.txCoins} SQ</span>
                </div>
              )}
            </div>

            {/* Metadata specs */}
            <div className="pt-4 border-t border-border/60 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-zinc-500">Platform:</span>
                <span className="text-zinc-200 font-medium">{game.platform}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-zinc-500">Category:</span>
                <span className="text-zinc-200 font-medium">{game.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-zinc-500">Release Status:</span>
                <span className="text-emerald-400 font-medium">Verified Official Release</span>
              </div>
            </div>
          </div>
        </div>

        {/* GAME SYNOPSIS & ABOUT */}
        <section className="rounded-2xl bg-[#0d1017] border border-border/80 p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-display font-bold text-white">About the Game</h2>
          <p className="text-zinc-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
            {game.description}
          </p>
        </section>

        {/* RELATED GAMES */}
        {related.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-display font-bold text-white">More Like This</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((rel) => (
                <Link
                  key={rel._id}
                  to={`/games/${rel.slug}`}
                  className="rounded-xl bg-[#0d1017] border border-border/80 overflow-hidden hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200 group"
                >
                  <div className="aspect-[4/3] bg-zinc-900 overflow-hidden">
                    <img
                      src={rel.coverImage}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm truncate">{rel.title}</h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
                      <span>{rel.category}</span>
                      <span className="font-bold text-emerald-400 tabular-nums">{rel.priceSQ} SQ</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
