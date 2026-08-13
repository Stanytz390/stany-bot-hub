import { useEffect, useState } from "react";
import { Copy, Upload, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { manualPaymentConfig, submitManualPayment, myManualPayments } from "@/lib/api";

interface Req {
  _id: string;
  method: string;
  sqAmount: number;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const USD_PER_SQ = 0.05; // 1 SQ ≈ $0.05

export function PayPalTopUp() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("masanyiwastanley378@gmail.com");
  const [sq, setSq] = useState("100");
  const [payerEmail, setPayerEmail] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<string>("");
  const [proofName, setProofName] = useState("");
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [open, setOpen] = useState(false);

  const load = () => { myManualPayments().then((d) => Array.isArray(d) && setReqs(d)).catch(() => {}); };

  useEffect(() => {
    manualPaymentConfig().then((c) => c?.paypalEmail && setEmail(c.paypalEmail)).catch(() => {});
    load();
  }, []);

  const usd = ((Number(sq) || 0) * USD_PER_SQ).toFixed(2);

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("Screenshot must be under 2MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => { setProof(String(reader.result)); setProofName(file.name); };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const amount = Number(sq);
    if (!amount || amount < 10) { showToast("Minimum 10 SQ", "error"); return; }
    if (!proof) { showToast("Please upload your payment screenshot", "error"); return; }
    setBusy(true);
    const res = await submitManualPayment({
      method: "paypal",
      sqAmount: Math.floor(amount),
      amount: Number(usd),
      currency: "USD",
      payerEmail: payerEmail || undefined,
      reference: reference || undefined,
      proofUrl: proof,
    });
    setBusy(false);
    if (res?.ok) {
      showToast("Sent for approval — admin will credit your SQ shortly", "success");
      setProof(""); setProofName(""); setReference("");
      load();
    } else showToast(res?.error || "Could not submit", "error");
  };

  return (
    <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="font-display font-semibold text-white">PayPal · International</p>
          <p className="mt-0.5 text-xs text-blue-300/70">Not in Tanzania? Pay with PayPal and send proof for approval.</p>
        </div>
        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200">
          {open ? "Hide" : "Open"}
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-blue-500/20 bg-[#0a0a0f]/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-blue-300/60">Send payment to</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-sm text-white">{email}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(email); showToast("PayPal email copied", "success"); }}
                className="shrink-0 rounded-lg bg-blue-500/20 p-2 text-blue-200"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-blue-300/70">SQ coins</span>
              <input
                type="number" min={10} value={sq} onChange={(e) => setSq(e.target.value)}
                className="mt-1 w-full rounded-xl border border-blue-500/20 bg-[#0a0a0f] px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
            </label>
            <div className="block">
              <span className="text-xs text-blue-300/70">You pay</span>
              <div className="mt-1 rounded-xl border border-blue-500/20 bg-[#0a0a0f] px-3 py-2 text-sm font-semibold text-blue-200">
                ${usd} USD
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-xs text-blue-300/70">Your PayPal email (optional)</span>
            <input
              value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="you@email.com"
              className="mt-1 w-full rounded-xl border border-blue-500/20 bg-[#0a0a0f] px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="text-xs text-blue-300/70">Transaction ID / note (optional)</span>
            <input
              value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 8XY12345AB"
              className="mt-1 w-full rounded-xl border border-blue-500/20 bg-[#0a0a0f] px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-blue-500/35 bg-[#0a0a0f]/60 p-4 transition hover:border-blue-400">
            <Upload className="h-5 w-5 text-blue-300" />
            <span className="text-sm text-blue-200">{proofName || "Upload payment screenshot (max 2MB)"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>

          <button
            onClick={submit}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Send for approval
          </button>

          {reqs.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs uppercase tracking-widest text-blue-300/60">My requests</p>
              {reqs.slice(0, 5).map((r) => (
                <div key={r._id} className="flex items-center justify-between rounded-lg border border-blue-500/15 bg-[#0a0a0f]/60 px-3 py-2 text-xs">
                  <span className="text-white">{r.sqAmount} SQ · {r.method.toUpperCase()}</span>
                  <span className={`flex items-center gap-1 ${r.status === "approved" ? "text-emerald-400" : r.status === "rejected" ? "text-red-400" : "text-amber-400"}`}>
                    {r.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : r.status === "rejected" ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
