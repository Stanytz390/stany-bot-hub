import { Share2, Check, Copy } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface ShareButtonProps {
  /** Absolute or relative path to share, e.g. /services/panels/purchasepanel?plan=abc */
  path: string;
  title: string;
  text?: string;
  className?: string;
  label?: string;
}

export function ShareButton({ path, title, text, className = "", label }: ShareButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;

  const share = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const data = { title, text: text || title, url };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user cancelled -> fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={t("share.label")}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : label ? <Share2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? t("share.copied") : label || t("share.label")}
    </button>
  );
}
