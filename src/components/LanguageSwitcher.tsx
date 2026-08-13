import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGUAGES, useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const active = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        className="glass-panel flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 hover:text-primary"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span>{active.flag}</span>
        <span className="hidden sm:inline">{active.code.toUpperCase()}</span>
      </button>

      {open && (
        <div className="glass-panel absolute right-0 mt-2 w-48 rounded-2xl p-1.5 z-50 shadow-2xl">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                l.code === lang ? "bg-primary/15 text-primary" : "text-foreground/85 hover:bg-primary/10"
              }`}
            >
              <span>{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              {l.code === lang && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
