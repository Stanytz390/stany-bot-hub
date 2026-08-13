import { useEffect, useRef, useState } from "react";
import { Bell, X, ExternalLink } from "lucide-react";
import { getNotifications, type AppNotification } from "@/lib/api";

const SEEN_KEY = "sh_notifications_seen_at";

/** Bell with admin broadcasts; unread count is based on the last time it was opened. */
export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(() => Number(localStorage.getItem(SEEN_KEY) || 0));
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => { getNotifications().then((n) => { if (alive) setItems(n); }).catch(() => {}); };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => new Date(n.createdAt).getTime() > seenAt).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      localStorage.setItem(SEEN_KEY, String(now));
      setSeenAt(now);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative rounded-xl border border-primary/25 p-3 text-primary transition-all duration-300 hover:border-primary/50 hover:bg-primary/10"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-primary/15 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <button onClick={() => setOpen(false)} aria-label="Close notifications" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
            ) : (
              items.map((n) => (
                <div key={n._id} className="border-b border-primary/10 px-4 py-3 last:border-0">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
