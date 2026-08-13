import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAds, trackAdClick } from "@/lib/api";
import { getPlatform, platformIcon } from "@/lib/platforms";
import { useAppSettings } from "@/hooks/useAppSettings";

interface AdItem {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetUrl: string;
  platform: string;
  buttonLabel?: string;
  /** Seconds this banner stays on screen (0 = use the global slide speed). */
  displaySeconds?: number;
  /** After this moment the banner disappears from the rotation. */
  endsAt?: string | null;
}

export function AdBanner() {
  const { settings } = useAppSettings();
  const globalSeconds = Math.max(2, Number(settings.adSlideSeconds) || 6);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getAds()
      .then((data) => {
        if (Array.isArray(data) && data.length) setAds(data);
      })
      .catch(() => {});
  }, []);

  // Drop banners whose display window has expired without needing a reload.
  useEffect(() => {
    if (!ads.some((a) => a.endsAt)) return;
    const t = setInterval(() => {
      setAds((prev) => prev.filter((a) => !a.endsAt || new Date(a.endsAt).getTime() > Date.now()));
    }, 30000);
    return () => clearInterval(t);
  }, [ads]);

  useEffect(() => {
    if (index >= ads.length) setIndex(0);
  }, [ads.length, index]);

  const goToSlide = useCallback(
    (newIndex: number) => {
      if (!ads.length) return;
      setIndex((newIndex + ads.length) % ads.length);
    },
    [ads.length],
  );

  const nextSlide = useCallback(() => goToSlide(index + 1), [goToSlide, index]);

  // Each banner can define its own on-screen time, otherwise the admin global speed is used.
  useEffect(() => {
    if (ads.length < 2 || paused) return;
    const seconds = Number(ads[index]?.displaySeconds) || globalSeconds;
    timer.current = setTimeout(nextSlide, Math.max(2, seconds) * 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ads, index, paused, nextSlide, globalSeconds]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  const handleAdClick = (ad: AdItem) => {
    trackAdClick(ad._id);
    window.open(ad.targetUrl, "_blank", "noopener,noreferrer");
  };

  if (!ads.length) return null;

  return (
    <div
      className="group relative w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {ads.map((ad) => {
          const p = getPlatform(ad.platform);
          return (
            <article key={ad._id} className="relative min-w-full">
              {/* Backdrop */}
              <div className="absolute inset-0">
                <img src={ad.imageUrl} alt="" aria-hidden className="h-full w-full object-cover opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/50" />
              </div>

              <div className="relative grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8">
                <div className="order-2 flex flex-col items-center gap-3 text-center sm:order-1 sm:items-start sm:text-left">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    <img src={platformIcon(p)} alt="" className="h-3.5 w-3.5" loading="lazy" />
                    {p.label}
                  </span>

                  <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
                    {ad.title}
                  </h3>
                  {ad.subtitle && (
                    <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{ad.subtitle}</p>
                  )}

                  <button
                    onClick={() => handleAdClick(ad)}
                    className="mt-1 inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:text-base"
                    style={{ backgroundColor: p.color, boxShadow: `0 10px 30px -12px ${p.color}` }}
                  >
                    <img src={platformIcon(p)} alt="" className="h-5 w-5" loading="lazy" />
                    {ad.buttonLabel?.trim() || p.cta}
                  </button>
                </div>

                {/* Big, clean banner image */}
                <div className="order-1 mx-auto w-full max-w-md sm:order-2 sm:w-[300px] lg:w-[380px]">
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="aspect-[16/10] w-full rounded-2xl border border-border object-cover shadow-2xl"
                    loading="lazy"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {ads.length > 1 && (
        <>
          <button
            onClick={() => goToSlide(index - 1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground opacity-0 transition group-hover:opacity-100 sm:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goToSlide(index + 1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground opacity-0 transition group-hover:opacity-100 sm:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
