import { useEffect, useState } from "react";
import { X, ExternalLink, Megaphone } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

const STORAGE_KEY = "channel-popup-dismissed-at";

/** Admin-configurable "follow our channel" popup. */
export function ChannelPopup() {
  const { settings } = useAppSettings();
  const popup = settings.channelPopup;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!popup?.enabled || !popup.url) return;
    const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
    const hours = Math.max(1, Number(popup.frequencyHours) || 24);
    if (Date.now() - last < hours * 3600_000) return;
    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [popup?.enabled, popup?.url, popup?.frequencyHours]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setOpen(false);
  };

  if (!open || !popup?.enabled || !popup.url) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/80 p-4 sm:items-center">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl">
        {popup.imageUrl ? (
          <img src={popup.imageUrl} alt={popup.title || "Channel"} className="h-36 w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-24 items-center justify-center bg-primary/10">
            <Megaphone className="h-9 w-9 text-primary" />
          </div>
        )}
        <div className="space-y-3 p-5">
          <h3 className="text-lg font-semibold text-foreground">{popup.title || "Follow our channel"}</h3>
          <p className="text-sm text-muted-foreground">{popup.text}</p>
          <div className="flex gap-2 pt-1">
            <a
              href={popup.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {popup.buttonLabel || "Follow now"} <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={dismiss}
              aria-label="Close"
              className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2.5 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
