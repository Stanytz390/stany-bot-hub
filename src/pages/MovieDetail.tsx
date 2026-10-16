import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { AppShell } from "@/components/AppShell";
import { getMovieBySlug, purchaseMovie } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Movie } from "@/types";
import {
  Film,
  Star,
  Coins,
  Play,
  CheckCircle,
  Clock,
  Calendar,
  Share2,
  Tv,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";

export default function MovieDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [related, setRelated] = useState<Movie[]>([]);
  const [isOwned, setIsOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isPlayingStream, setIsPlayingStream] = useState(false);

  useEffect(() => {
    if (slug) {
      loadMovie(slug);
    }
  }, [slug]);

  const loadMovie = async (movieSlug: string) => {
    try {
      setLoading(true);
      const res = await getMovieBySlug(movieSlug);
      setMovie(res.movie);
      setRelated(res.related || []);
      setIsOwned(res.isOwned || false);
    } catch {
      toast("Could not find requested film", "error");
      navigate("/movies");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!movie) return;
    if (!user) {
      toast("Please sign in to buy movies with your SQ wallet", "info");
      navigate("/login");
      return;
    }

    const discount = movie.discount || 0;
    const finalPrice = Math.max(0, Math.round(movie.priceSQ * (1 - discount / 100)));

    if (user.txCoins < finalPrice) {
      toast(
        `Insufficient balance. You need ${finalPrice} SQ (Available: ${user.txCoins} SQ).`,
        "error"
      );
      navigate("/topup");
      return;
    }

    try {
      setPurchasing(true);
      const res = await purchaseMovie(movie._id);
      toast(res.message || "Film unlocked successfully!", "success");
      setIsOwned(true);
      await refreshUser?.();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Purchase failed", "error");
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
      <AppShell title="Loading Film...">
        <div className="max-w-6xl mx-auto py-12 animate-pulse space-y-6">
          <div className="h-80 bg-zinc-900 rounded-2xl" />
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
        </div>
      </AppShell>
    );
  }

  if (!movie) return null;

  const discount = movie.discount || 0;
  const finalSQ = Math.max(0, Math.round(movie.priceSQ * (1 - discount / 100)));
  const embedTrailer = movie.trailerUrl ? getYoutubeEmbedUrl(movie.trailerUrl) : null;

  return (
    <AppShell title={movie.title} subtitle={`${movie.genre} · ${movie.duration}`}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* CINEMATIC HERO VIEWPORT */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-border/80 shadow-2xl">
          {isPlayingStream && isOwned && movie.watchUrl ? (
            <div className="aspect-[16/9] w-full bg-black">
              {movie.watchUrl.endsWith(".mp4") ? (
                <video
                  src={movie.watchUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={movie.watchUrl}
                  title={movie.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              )}
            </div>
          ) : (
            <div className="relative aspect-[16/9] md:aspect-[21/9]">
              <img
                src={movie.backdropImage || movie.posterImage}
                alt={movie.title}
                className="w-full h-full object-cover brightness-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/50 to-transparent" />

              {/* Play / Trailer Overlay Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isOwned && movie.watchUrl ? (
                  <button
                    onClick={() => setIsPlayingStream(true)}
                    className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition"
                  >
                    <Play className="w-8 h-8 fill-black translate-x-0.5" />
                  </button>
                ) : embedTrailer ? (
                  <a
                    href={movie.trailerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-white font-semibold text-sm flex items-center gap-2 border border-zinc-700/80 backdrop-blur-md shadow-2xl hover:scale-105 transition"
                  >
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    Watch Official Trailer
                  </a>
                ) : null}
              </div>

              {/* Title & Metadata Bottom Overlay */}
              <div className="absolute bottom-6 inset-x-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-1 block">
                    Cinema Premiere
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-white leading-tight">
                    {movie.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-300 mt-2">
                    <span className="font-medium text-emerald-400">{movie.genre}</span>
                    <span aria-hidden="true">·</span>
                    <span>{movie.releaseYear}</span>
                    <span aria-hidden="true">·</span>
                    <span>{movie.duration}</span>
                    <span aria-hidden="true">·</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[11px] font-semibold">
                      {movie.maturityRating}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {movie.rating} / 10
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isOwned ? (
                    <button
                      onClick={() => setIsPlayingStream(true)}
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Watch Film
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {purchasing ? "Unlocking..." : `Unlock for ${finalSQ} SQ`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: SYNOPSIS & MEDIA */}
          <div className="lg:col-span-8 rounded-2xl bg-[#0d1017] border border-border/80 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold text-white mb-3">Synopsis</h2>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                {movie.synopsis}
              </p>
            </div>

            {/* TRAILER EMBED */}
            {embedTrailer && (
              <div className="pt-4 border-t border-border/60">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-emerald-400" />
                  Official Trailer Preview
                </h3>
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-black border border-border/60">
                  <iframe
                    src={embedTrailer}
                    title={`${movie.title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: CINEMA TICKET / PURCHASE CARD */}
          <div className="lg:col-span-4 rounded-2xl bg-[#0d1017] border border-border/80 p-6 space-y-6">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-border/60 shadow-lg">
              <img src={movie.posterImage} alt={movie.title} className="w-full h-full object-cover" />
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-zinc-400">Unlimited Cinema Access</span>
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
                    {movie.priceSQ} SQ
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                Local currency: {movie.priceTZS.toLocaleString()} TZS
              </p>
            </div>

            {isOwned ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>You own this film. Stream anytime without extra charges.</span>
              </div>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition"
              >
                <ShoppingBag className="w-4 h-4" />
                {purchasing ? "Processing..." : `Unlock Film (${finalSQ} SQ)`}
              </button>
            )}

            {movie.externalWatchUrl && (
              <a
                href={movie.externalWatchUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Official Catalog
              </a>
            )}

            <div className="pt-2 border-t border-border/60 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-zinc-500">Audio / Language:</span>
                <span className="text-zinc-200 font-medium">English 5.1 & Swahili Subtitles</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-zinc-500">Resolution:</span>
                <span className="text-emerald-400 font-medium">Ultra HD 4K / 1080p</span>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED FILMS */}
        {related.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-display font-bold text-white">Recommended Cinema Titles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((rel) => (
                <Link
                  key={rel._id}
                  to={`/movies/${rel.slug}`}
                  className="rounded-xl bg-[#0d1017] border border-border/80 overflow-hidden hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200 group"
                >
                  <div className="aspect-[3/4] bg-zinc-900 overflow-hidden">
                    <img
                      src={rel.posterImage}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm truncate">{rel.title}</h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
                      <span>{rel.genre.split(",")[0]}</span>
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
