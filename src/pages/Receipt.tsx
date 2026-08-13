import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { jsPDF } from "jspdf";
import { Download, Share2, ArrowLeft, CheckCircle2, Loader2, Receipt as ReceiptIcon } from "lucide-react";
import { getReceipt, type Receipt as ReceiptData } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";
import { Seo } from "@/components/Seo";

const BRAND = "Stany Hosting";

function buildPdf(r: ReceiptData) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(9, 14, 20);
  doc.rect(0, 0, w, 90, "F");
  doc.setTextColor(45, 212, 191);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(BRAND, 28, 42);
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.setFont("helvetica", "normal");
  doc.text("Official payment receipt", 28, 62);
  doc.text(r.receiptNo, w - 28, 42, { align: "right" });

  const rows: [string, string][] = [
    ["Status", "VERIFIED / PAID"],
    ["Date", new Date(r.date).toLocaleString()],
    ["Item", r.itemName],
    ["SQ Coins", `${r.sqAmount} SQ`],
    ["Amount", r.tzsAmount ? `TZS ${r.tzsAmount.toLocaleString()}` : "Paid from SQ balance"],
    ["Payment method", r.methodLabel + (r.channelProvider ? ` · ${r.channelProvider}` : "")],
    ...(r.promoCode ? ([["Promo code", `${r.promoCode} (-${r.discountAmount || 0})`]] as [string, string][]) : []),
    ["Reference", r.reference],
    ["Customer", r.customer.username || r.customer.email],
    ["Email", r.customer.email],
  ];

  let y = 125;
  doc.setFontSize(11);
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(20, y - 13, w - 40, 24, "F");
    }
    doc.setTextColor(100, 116, 139);
    doc.text(k, 28, y + 3);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(String(v), w - 28, y + 3, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 26;
  });

  doc.setDrawColor(210);
  doc.line(20, y + 6, w - 20, y + 6);
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 145);
  doc.text("Thank you for choosing Stany Hosting.", 28, y + 26);
  doc.text("This receipt is generated after gateway verification.", 28, y + 40);

  return doc;
}

export default function ReceiptPage() {
  const { ref } = useParams();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await getReceipt(String(ref));
        if (!alive) return;
        if ((r as { error?: string }).error) setError((r as { error?: string }).error!);
        else setData(r);
      } catch {
        if (alive) setError(t("receipt.notFound"));
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [ref, t]);

  const download = () => {
    if (!data) return;
    buildPdf(data).save(`${data.receiptNo}.pdf`);
  };

  const share = async () => {
    if (!data) return;
    const url = `${window.location.origin}/receipt/${encodeURIComponent(data.reference)}`;
    const text = `${BRAND} — ${data.itemName}: ${data.sqAmount} SQ · ${data.receiptNo}`;
    try {
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share) {
        const blob = buildPdf(data).output("blob");
        const file = new File([blob], `${data.receiptNo}.pdf`, { type: "application/pdf" });
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ title: BRAND, text, files: [file] });
          return;
        }
        await nav.share({ title: BRAND, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast(t("share.copied"), "success");
    } catch { /* user cancelled */ }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <Seo title={`${t("receipt.title")} · ${BRAND}`} description={t("receipt.subtitle")} />
      <div className="mx-auto w-full max-w-md space-y-4">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> {t("nav.dashboard")}
        </Link>

        {loading ? (
          <div className="glass-card flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : error || !data ? (
          <div className="glass-card p-8 text-center">
            <ReceiptIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error || t("receipt.notFound")}</p>
          </div>
        ) : (
          <>
            <div className="glass-card overflow-hidden">
              <div className="border-b border-primary/15 bg-primary/10 px-5 py-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-9 w-9 text-primary" />
                <h1 className="font-display text-lg font-bold">{t("receipt.title")}</h1>
                <p className="text-xs text-muted-foreground">{t("receipt.verified")}</p>
                <p className="mt-2 font-mono text-xs text-primary">{data.receiptNo}</p>
              </div>

              <dl className="divide-y divide-border/60 px-5 py-2 text-sm">
                {[
                  [t("receipt.item"), data.itemName],
                  [t("receipt.sq"), `${data.sqAmount} SQ`],
                  [t("receipt.amount"), data.tzsAmount ? `TZS ${data.tzsAmount.toLocaleString()}` : t("receipt.fromBalance")],
                  [t("receipt.method"), data.methodLabel + (data.channelProvider ? ` · ${data.channelProvider}` : "")],
                  ...(data.promoCode ? [[t("promo.title"), `${data.promoCode} (-${data.discountAmount || 0})`]] : []),
                  [t("receipt.reference"), data.reference],
                  [t("receipt.date"), new Date(data.date).toLocaleString()],
                  [t("receipt.customer"), data.customer.username || data.customer.email],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-start justify-between gap-4 py-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-all text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={download} className="btn-pink inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
                <Download className="h-4 w-4" /> {t("receipt.download")}
              </button>
              <button onClick={share} className="glass-card inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary">
                <Share2 className="h-4 w-4" /> {t("receipt.share")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
