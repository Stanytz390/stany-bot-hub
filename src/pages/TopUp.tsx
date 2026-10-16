import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { 
  Coins, ArrowLeft, Check, Loader2, Plus, Minus, 
  Copy, ChevronDown, ChevronRight, Bitcoin, Wallet, 
  Send, Upload, X, Calculator, ArrowRightLeft, RefreshCw,
  Globe, Shield, Zap, Star, TrendingUp, Sparkles, Crown,
  CreditCard, Smartphone, BadgeCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { validatePromo } from "@/lib/api";
import { useNavLoader } from "@/App";
import { getPackages, getMobileChargeStatus } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { PageLoader } from "@/components/PageLoader";
import { TechBackground } from "@/components/TechBackground";
import { PayPalTopUp } from "@/components/PayPalTopUp";

// ============================================================
// INTERFACES
// ============================================================
interface Package {
  _id: string;
  name: string;
  tzsPrice: number;
  txAmount: number;
  bonusTx: number;
  isBestDeal: boolean;
  order: number;
}

interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  rate: number;
  flag: string;
}

// ============================================================
// CONSTANTS - FIXED RATES
// ============================================================
const USD_TO_TZS = 2646.14;
const USD_TO_KES = 129.20;
const USD_TO_NGN = 1550;
const USD_TO_UGX = 3800;
const USD_TO_GHS = 15.5;
const USD_TO_ZAR = 19.2;

// SQ RATE - 1 SQ = 100 TZS (FIXED!)
const SQ_RATE_TZS = 100;
const SQ_TO_USD = SQ_RATE_TZS / USD_TO_TZS;

// MINIMUM: 10 SQ = 1000 TZS
const MINIMUM_SQ = 10;
const MINIMUM_TZS = 1000;
const WHATSAPP_NUMBER = "255620490076";
const MINIPAY_NAME = "Masanyiwa Stanley";

// ============================================================
// COUNTRY DATA
// ============================================================
const COUNTRIES: Country[] = [
  { 
    code: "TZ", 
    name: "Tanzania", 
    currency: "TZS", 
    symbol: "TSh", 
    rate: SQ_RATE_TZS,
    flag: "🇹🇿" 
  },
  { 
    code: "KE", 
    name: "Kenya", 
    currency: "KES", 
    symbol: "KSh", 
    rate: SQ_TO_USD * USD_TO_KES,
    flag: "🇰🇪" 
  },
  { 
    code: "NG", 
    name: "Nigeria", 
    currency: "NGN", 
    symbol: "₦", 
    rate: SQ_TO_USD * USD_TO_NGN,
    flag: "🇳🇬" 
  },
  { 
    code: "UG", 
    name: "Uganda", 
    currency: "UGX", 
    symbol: "USh", 
    rate: SQ_TO_USD * USD_TO_UGX,
    flag: "🇺🇬" 
  },
  { 
    code: "GH", 
    name: "Ghana", 
    currency: "GHS", 
    symbol: "GH₵", 
    rate: SQ_TO_USD * USD_TO_GHS,
    flag: "🇬🇭" 
  },
  { 
    code: "ZA", 
    name: "South Africa", 
    currency: "ZAR", 
    symbol: "R", 
    rate: SQ_TO_USD * USD_TO_ZAR,
    flag: "🇿🇦" 
  },
];

// ============================================================
// PAYMENT METHODS
// ============================================================
const PAYMENT_METHODS = [
  { 
    id: "mpesa", 
    label: "M-Pesa", 
    logo: "https://www.image2url.com/r2/default/images/1785847216385-40ac4042-5b52-4f75-853d-fde9fe2958e7.jpeg" 
  },
  { 
    id: "tigo", 
    label: "Tigo Pesa", 
    logo: "https://www.image2url.com/r2/default/images/1785847308807-594157ca-8430-468d-94d5-054e946e75e3.png" 
  },
  { 
    id: "airtel", 
    label: "Airtel Money", 
    logo: "https://www.image2url.com/r2/default/images/1785847485739-3d016e52-7f21-45c5-912b-4866964d267f.jpeg" 
  },
  { 
    id: "halotel", 
    label: "Halopesa", 
    logo: "https://www.image2url.com/r2/default/images/1785847385430-b9b67a52-7f54-45b9-8169-b7ef077fbef3.jpeg" 
  },
  { 
    id: "crdb", 
    label: "CRDB Bank", 
    logo: "https://www.image2url.com/r2/default/images/1785846902319-e551410b-3107-4ea1-8237-31db71faf5ad.png" 
  },
  { 
    id: "nmb", 
    label: "NMB Bank", 
    logo: "https://www.image2url.com/r2/default/images/1785846766860-e605aa1f-8cf1-459d-ae36-f5245c3f4dde.png" 
  },
];

// ============================================================
// HELPERS
// ============================================================
function cleanErrorMessage(raw: unknown): string {
  if (!raw) return "Payment failed. Please try again.";
  let clean = "";
  if (typeof raw === 'string') {
    clean = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    const errorObj = raw as any;
    clean = errorObj.message || errorObj.error || errorObj.data?.message || JSON.stringify(raw);
  } else {
    clean = String(raw);
  }
  clean = clean.replace(/[{}"]/g, "");
  clean = clean.replace(/\\/g, "");
  clean = clean.replace(/^(ge|message|error|type|data|status|code)\s*[: ]*/i, "");
  clean = clean.replace(/,/g, ", ");
  clean = clean.replace(/\[|\]/g, "");
  clean = clean.trim();
  
  if (clean.includes("401") || clean.toLowerCase().includes("auth")) {
    clean = "Payment authentication failed. Please contact support.";
  } else if (clean.includes("403") || clean.toLowerCase().includes("whitelist")) {
    clean = "Payment service unavailable. Please try again later.";
  } else if (clean.includes("422") || clean.toLowerCase().includes("minimum")) {
    clean = `Minimum payment is ${MINIMUM_TZS.toLocaleString()} TZS (${MINIMUM_SQ} SQ).`;
  } else if (clean.includes("500")) {
    clean = "Payment service error. Please try again later.";
  } else if (clean.toLowerCase().includes("insufficient")) {
    clean = "Insufficient funds. Please try again.";
  }
  
  if (clean.length < 3) {
    clean = "Payment failed. Please try again.";
  }
  if (!clean.endsWith(".") && !clean.endsWith("?") && !clean.endsWith("!")) {
    clean += ".";
  }
  return clean;
}

function validateTanzanianPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const digits = phone.replace(/\D/g, "");
  
  if (digits.startsWith("0") && digits.length === 10) {
    return { valid: true, normalized: "255" + digits.slice(1) };
  }
  
  if (digits.startsWith("255") && digits.length === 12) {
    return { valid: true, normalized: digits };
  }
  
  if (digits.startsWith("255") && digits.length === 13) {
    return { valid: true, normalized: digits };
  }
  
  return { 
    valid: false, 
    normalized: digits, 
    error: "Enter a valid Tanzanian phone (e.g. 0712345678 or 255712345678)" 
  };
}

// ============================================================
// COPY BUTTON
// ============================================================
function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button 
      onClick={handle} 
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 text-xs font-semibold ${
        copied 
          ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30" 
          : "text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40"
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label || "Copy"}
    </button>
  );
}

// ============================================================
// CURRENCY CALCULATOR
// ============================================================
function CurrencyCalculator({ 
  country, 
  onAmountChange,
  initialSQ = 10
}: { 
  country: Country;
  onAmountChange: (sq: number, localAmount: number) => void;
  initialSQ?: number;
}) {
  const [sqAmount, setSqAmount] = useState(initialSQ);
  const [localAmount, setLocalAmount] = useState(initialSQ * country.rate);

  useEffect(() => {
    const newLocal = Math.max(sqAmount * country.rate, MINIMUM_SQ * country.rate);
    setLocalAmount(newLocal);
    onAmountChange(sqAmount, newLocal);
  }, [country, sqAmount, onAmountChange]);

  useEffect(() => {
    if (sqAmount < MINIMUM_SQ) {
      setSqAmount(MINIMUM_SQ);
      setLocalAmount(MINIMUM_SQ * country.rate);
      onAmountChange(MINIMUM_SQ, MINIMUM_SQ * country.rate);
    }
  }, [country]);

  const updateFromSQ = useCallback((sq: number) => {
    const validSQ = Math.max(MINIMUM_SQ, Math.round(sq));
    setSqAmount(validSQ);
    const local = validSQ * country.rate;
    setLocalAmount(local);
    onAmountChange(validSQ, local);
  }, [country.rate, onAmountChange]);

  const updateFromLocal = useCallback((local: number) => {
    const validLocal = Math.max(MINIMUM_SQ * country.rate, local);
    const sq = Math.round(validLocal / country.rate);
    const adjustedLocal = sq * country.rate;
    setSqAmount(sq);
    setLocalAmount(adjustedLocal);
    onAmountChange(sq, adjustedLocal);
  }, [country.rate, onAmountChange]);

  const quickAmounts = useMemo(() => {
    const baseAmounts = [5, 10, 20, 30, 50, 100];
    return baseAmounts.map(sq => ({
      sq,
      local: sq * country.rate,
      isActive: Math.abs(sqAmount - sq) < 0.01
    }));
  }, [country.rate, sqAmount]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center border border-violet-500/30">
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">1 SQ = {country.symbol} {country.rate.toFixed(2)}</p>
            <p className="text-[10px] text-violet-400/70 font-medium">Fixed rate</p>
          </div>
        </div>
        <button 
          onClick={() => updateFromSQ(sqAmount)}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-500/10"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#0a0a0f]/80 to-[#1a1a2e]/80 backdrop-blur-sm rounded-2xl p-5 border border-violet-500/20 shadow-xl shadow-violet-500/5">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider mb-2">SQ Coins</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (sqAmount > MINIMUM_SQ) updateFromSQ(sqAmount - 1); }}
                className="w-10 h-10 rounded-xl border border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all flex items-center justify-center text-violet-400 disabled:opacity-30"
                disabled={sqAmount <= MINIMUM_SQ}
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={sqAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) updateFromSQ(val);
                }}
                min={MINIMUM_SQ}
                className="w-full text-center text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                onClick={() => updateFromSQ(sqAmount + 1)}
                className="w-10 h-10 rounded-xl border border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all flex items-center justify-center text-violet-400"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-violet-400/60 mt-2 font-medium">Min {MINIMUM_SQ} SQ</p>
          </div>

          <div className="flex items-center justify-center px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-violet-400" />
            </div>
          </div>

          <div className="flex-1">
            <p className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider mb-2">{country.currency}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newLocal = localAmount - country.rate;
                  if (newLocal >= MINIMUM_SQ * country.rate) updateFromLocal(newLocal);
                }}
                className="w-10 h-10 rounded-xl border border-fuchsia-500/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/50 transition-all flex items-center justify-center text-fuchsia-400 disabled:opacity-30"
                disabled={localAmount <= MINIMUM_SQ * country.rate}
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={localAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) updateFromLocal(val);
                }}
                min={MINIMUM_SQ * country.rate}
                className="w-full text-center text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                onClick={() => updateFromLocal(localAmount + country.rate)}
                className="w-10 h-10 rounded-xl border border-fuchsia-500/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/50 transition-all flex items-center justify-center text-fuchsia-400"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-fuchsia-400/60 mt-2 font-medium">
              Min {country.symbol} {country.code === "TZ" 
                ? (MINIMUM_SQ * country.rate).toLocaleString() 
                : (MINIMUM_SQ * country.rate).toFixed(2)
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickAmounts.map(({ sq, local, isActive }) => (
          <button
            key={sq}
            onClick={() => updateFromSQ(sq)}
            className={`px-3 py-2 rounded-xl border text-xs transition-all duration-300 font-semibold ${
              isActive
                ? "border-violet-500/60 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 text-white shadow-lg shadow-violet-500/20"
                : "border-violet-500/20 hover:border-violet-500/40 bg-violet-500/5 text-violet-300 hover:text-white hover:bg-violet-500/10"
            }`}
          >
            {sq} SQ <span className="opacity-60">
              ({country.code === "TZ" 
                ? `TSh ${local.toLocaleString()}` 
                : `${country.symbol}${local.toFixed(2)}`
              })
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MANUAL PAYMENT MODAL
// ============================================================
function ManualPaymentModal({ 
  isOpen, 
  onClose, 
  method, 
  details,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  method: "minipay" | "btc" | "bnb";
  details: { number?: string; name?: string; address?: string };
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const methodLabels = {
    minipay: "Minipay",
    btc: "Bitcoin",
    bnb: "BNB Smart Chain"
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image too large. Max 5MB.", "error");
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!reference.trim()) {
      showToast("Please enter transaction ID or reference", "error");
      return;
    }

    if (!screenshot) {
      showToast("Please upload a screenshot of payment", "error");
      return;
    }

    setSending(true);

    try {
      const username = user?.username || user?.email || "STANY User";
      const methodName = methodLabels[method];
      const message = `📝 *New Manual Payment*\n\n` +
        `👤 *Username:* @${username}\n` +
        `💳 *Method:* ${methodName}\n` +
        `🔖 *Reference/Transaction ID:* ${reference.trim()}\n` +
        `📅 *Date:* ${new Date().toLocaleString()}\n\n` +
        `✅ Please confirm and add SQ coins.`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

      window.open(whatsappUrl, "_blank");
      await navigator.clipboard.writeText(reference.trim());

      showToast("WhatsApp opened! Please send the screenshot.", "success");
      
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1500);

    } catch (error) {
      showToast("Failed to open WhatsApp. Please contact manually.", "error");
    } finally {
      setSending(false);
      setReference("");
      setScreenshot(null);
      setScreenshotPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] border border-violet-500/20 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-violet-500/20">
        <div className="flex items-center justify-between p-5 border-b border-violet-500/10 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center border border-violet-500/30 shadow-lg shadow-violet-500/20">
              {method === "minipay" && <span className="text-sm font-bold text-white">MP</span>}
              {method === "btc" && <Bitcoin className="w-5 h-5 text-orange-400" />}
              {method === "bnb" && <Wallet className="w-5 h-5 text-yellow-400" />}
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Manual Payment</h2>
              <p className="text-xs text-violet-400/70 font-medium">{methodLabels[method]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-violet-500/10 transition-all text-violet-400 hover:text-violet-300 hover:rotate-90 duration-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 rounded-2xl p-4 border border-violet-500/20">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Send payment to
            </p>
            {method === "minipay" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-[#0a0a0f]/50 rounded-xl p-3 border border-violet-500/10">
                  <span className="text-xs text-violet-400/70 font-medium">Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white font-semibold">{details.number}</span>
                    <CopyBtn text={details.number || ""} label="" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-[#0a0a0f]/50 rounded-xl p-3 border border-violet-500/10">
                  <span className="text-xs text-violet-400/70 font-medium">Name</span>
                  <span className="font-bold text-sm text-white">{details.name}</span>
                </div>
              </div>
            )}
            {(method === "btc" || method === "bnb") && (
              <div className="bg-[#0a0a0f]/50 rounded-xl p-3 border border-violet-500/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-violet-400/70 font-medium">Address</span>
                  <div className="flex items-center gap-2 flex-1 ml-2">
                    <code className="text-xs font-mono text-white break-all flex-1">{details.address}</code>
                    <CopyBtn text={details.address || ""} label="" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-2 flex items-center gap-2">
              <BadgeCheck className="w-3.5 h-3.5" />
              Transaction ID / Reference <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TXN-1234567890"
              className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f]/50 border border-violet-500/20 text-white text-sm placeholder:text-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-2 flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />
              Payment Screenshot <span className="text-red-400">*</span>
            </label>
            {!screenshotPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 rounded-xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all cursor-pointer text-center group"
              >
                <Upload className="w-10 h-10 text-violet-400/50 mx-auto mb-3 group-hover:text-violet-400 transition-colors" />
                <p className="text-sm text-violet-300 font-semibold">Tap to upload screenshot</p>
                <p className="text-xs text-violet-400/50 mt-1">PNG, JPG, WEBP (Max 5MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-violet-500/30 shadow-lg shadow-violet-500/10">
                <img src={screenshotPreview} alt="Screenshot preview" className="w-full max-h-48 object-contain bg-[#0a0a0f]/50" />
                <button
                  onClick={removeScreenshot}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white transition-all shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !reference.trim() || !screenshot}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "Sending..." : "Send via WhatsApp"}
          </button>

          <p className="text-[10px] text-violet-400/60 text-center font-medium">
            WhatsApp will open with pre-filled message. Attach the screenshot manually.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CRYPTO PAYMENT SECTION
// ============================================================
function CryptoPaymentSection({ onManualPay }: { onManualPay: (method: "minipay" | "btc" | "bnb") => void }) {
  const [showBTC, setShowBTC] = useState(false);
  const [showBNB, setShowBNB] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 overflow-hidden shadow-lg shadow-orange-500/10">
        <button
          onClick={() => setShowBTC(!showBTC)}
          className="w-full flex items-center justify-between p-4 hover:bg-orange-500/10 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/20 flex items-center justify-center border border-orange-500/30 shadow-lg shadow-orange-500/20">
              <Bitcoin className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-white">Bitcoin (BTC)</p>
              <p className="text-xs text-orange-400/70">Send BTC to this address</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-orange-400 transition-transform duration-300 ${showBTC ? "rotate-180" : ""}`} />
        </button>
        {showBTC && (
          <div className="px-4 pb-4 space-y-3 animate-slide-down">
            <div className="bg-[#0a0a0f]/80 rounded-xl p-3 border border-orange-500/20">
              <p className="text-xs text-orange-400/70 mb-1 font-semibold">BTC Address</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-orange-300 break-all flex-1">
                  bc1qps8kp0kcfhn6ky8ngqs8tmz58m9lrhrw79xdzm
                </code>
                <CopyBtn text="bc1qps8kp0kcfhn6ky8ngqs8tmz58m9lrhrw79xdzm" label="Copy" />
              </div>
            </div>
            <button
              onClick={() => onManualPay("btc")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Confirm Payment via WhatsApp
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 overflow-hidden shadow-lg shadow-yellow-500/10">
        <button
          onClick={() => setShowBNB(!showBNB)}
          className="w-full flex items-center justify-between p-4 hover:bg-yellow-500/10 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 flex items-center justify-center border border-yellow-500/30 shadow-lg shadow-yellow-500/20">
              <Wallet className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-white">BNB Smart Chain (BSC)</p>
              <p className="text-xs text-yellow-400/70">Send BNB to this address</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-yellow-400 transition-transform duration-300 ${showBNB ? "rotate-180" : ""}`} />
        </button>
        {showBNB && (
          <div className="px-4 pb-4 space-y-3 animate-slide-down">
            <div className="bg-[#0a0a0f]/80 rounded-xl p-3 border border-yellow-500/20">
              <p className="text-xs text-yellow-400/70 mb-1 font-semibold">BNB Smart Chain Address</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-yellow-300 break-all flex-1">
                  0x9fafbe3e6e6607397342fbecbe4d6105f7240ef7
                </code>
                <CopyBtn text="0x9fafbe3e6e6607397342fbecbe4d6105f7240ef7" label="Copy" />
              </div>
            </div>
            <button
              onClick={() => onManualPay("bnb")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Confirm Payment via WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MINIPAY PAYMENT SECTION
// ============================================================
function MinipayPaymentSection({ onManualPay }: { onManualPay: (method: "minipay" | "btc" | "bnb") => void }) {
  const [showMinipay, setShowMinipay] = useState(false);
  const [showCrypto, setShowCrypto] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowMinipay(!showMinipay)}
        className="w-full flex items-center justify-between p-4 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 hover:from-violet-500/15 hover:to-fuchsia-500/10 transition-all shadow-lg shadow-violet-500/10"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/30 shadow-lg shadow-violet-500/20">
            <span className="text-lg font-bold text-white">MP</span>
          </div>
          <div className="text-left">
            <p className="font-bold text-sm text-white">Pay with Minipay</p>
            <p className="text-xs text-violet-400/70">Manual payment · WhatsApp confirmation</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform duration-300 ${showMinipay ? "rotate-180" : ""}`} />
      </button>

      {showMinipay && (
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5 space-y-4 animate-slide-down shadow-xl shadow-violet-500/5">
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#0a0a0f]/80 rounded-xl p-3 border border-violet-500/20">
              <div>
                <p className="text-xs text-violet-400/70 font-semibold">Minipay Number</p>
                <p className="font-mono text-sm text-white font-bold">+255787069580</p>
              </div>
              <CopyBtn text="+255787069580" label="Copy Number" />
            </div>
            <div className="flex items-center justify-between bg-[#0a0a0f]/80 rounded-xl p-3 border border-violet-500/20">
              <div>
                <p className="text-xs text-violet-400/70 font-semibold">Minipay Name</p>
                <p className="font-bold text-sm text-white">{MINIPAY_NAME}</p>
              </div>
              <CopyBtn text={MINIPAY_NAME} label="Copy Name" />
            </div>
          </div>

          <button
            onClick={() => onManualPay("minipay")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Confirm Payment via WhatsApp
          </button>

          <button
            onClick={() => setShowCrypto(!showCrypto)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-violet-400 hover:text-violet-300 transition-all font-semibold hover:bg-violet-500/10 rounded-xl"
          >
            {showCrypto ? "Hide" : "💳 Pay with Crypto?"}
            <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${showCrypto ? "rotate-90" : ""}`} />
          </button>

          {showCrypto && <CryptoPaymentSection onManualPay={onManualPay} />}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAYMENT MODAL
// ============================================================
function PaymentModal({ 
  isOpen, 
  onClose, 
  pkg, 
  onSuccess, 
  country,
  sqAmount,
  onAmountChange
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  pkg: Package | null; 
  onSuccess: () => void; 
  country: Country;
  sqAmount: number;
  onAmountChange: (sq: number, local: number) => void;
}) {
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("mpesa");
  const [stage, setStage] = useState<"select" | "pending" | "success" | "failed">("select");
  const [message, setMessage] = useState("");
  const [failReason, setFailReason] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [gatewayStatus, setGatewayStatus] = useState("");
  const [gatewayMessage, setGatewayMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promo, setPromo] = useState<{ code: string; discountPercent: number; discount: number } | null>(null);
  const { showToast } = useToast();

  const totalSQ = pkg ? (pkg.txAmount || 0) + (pkg.bonusTx || 0) : sqAmount;
  const tzsAmount = pkg ? pkg.tzsPrice : Math.round(totalSQ * SQ_RATE_TZS);
  const payableTzs = promo ? Math.max(0, tzsAmount - promo.discount) : tzsAmount;
  const isBelowMinimum = totalSQ < MINIMUM_SQ || tzsAmount < MINIMUM_TZS;
  const isTanzania = country.code === "TZ";

  const handleClose = useCallback(() => {
    if (stage === "pending") {
      showToast("Payment cancelled. If you were charged, please contact support.", "error");
    }
    onClose();
  }, [stage, onClose, showToast]);

  useEffect(() => {
    if (!isOpen) {
      setStage("select");
      setPhone("");
      setReference("");
      setMessage("");
      setFailReason("");
      setLoading(false);
      setPollCount(0);
      setProvider("mpesa");
      setPromo(null);
      setPromoInput("");
      setIsProcessing(false);
      setGatewayStatus("");
      setGatewayMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (stage !== "pending" || !reference) return;
    
    let isMounted = true;
    let count = 0;
    
    const interval = setInterval(async () => {
      if (!isMounted) return;
      
      count += 1;
      setPollCount(count);
      
      if (count >= 40) {
        clearInterval(interval);
        if (isMounted) {
          setStage("failed");
          setFailReason("Payment timed out. Please try again or contact support.");
        }
        return;
      }

      try {
        const data = await getMobileChargeStatus(reference);
        if (!isMounted) return;

        if (data.gatewayStatus) setGatewayStatus(String(data.gatewayStatus));
        if (data.message) setGatewayMessage(String(data.message));

        if (data.status === "success") {
          clearInterval(interval);
          if (isMounted) {
            setStage("success");
            showToast(`Payment confirmed! ${totalSQ} SQ added to your balance.`, "success");
            onSuccess();
          }
          return;
        }

        if (data.status === "failed") {
          clearInterval(interval);
          if (isMounted) {
            setStage("failed");
            setFailReason(data.message || "Payment failed. Please try again.");
          }
          return;
        }
      } catch (error) {
        console.debug("Polling error:", error);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stage, reference, onSuccess, showToast, totalSQ]);

  const handlePayment = async () => {
    if (isProcessing) return;
    
    const validation = validateTanzanianPhone(phone);
    if (!validation.valid) {
      showToast(validation.error || "Enter a valid Tanzanian phone number", "error");
      return;
    }

    const normalizedPhone = validation.normalized;

    if (isBelowMinimum) {
      showToast(`Minimum deposit is ${MINIMUM_SQ} SQ (${MINIMUM_TZS.toLocaleString()} TZS).`, "error");
      return;
    }

    setIsProcessing(true);
    setLoading(true);
    
    try {
      const res = await fetch("/api/payments/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          packageId: pkg?._id,
          txAmount: pkg ? undefined : totalSQ,
          phone: normalizedPhone,
          provider: provider,
          tzsAmount: tzsAmount,
          promoCode: promo?.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(cleanErrorMessage(data.error || "Payment initiation failed"), "error");
        return;
      }

      if (data.reference) {
        setReference(data.reference);
        setMessage(data.message || "USSD push sent to your phone. Please check and confirm.");
        setStage("pending");
        setPollCount(0);
      } else {
        showToast(data.message || "Payment initiation failed", "error");
      }
    } catch (error) {
      showToast(cleanErrorMessage(error), "error");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const modalContent = useMemo(() => {
    if (stage === "success") {
      return (
        <div className="flex flex-col items-center gap-5 py-8">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-xl text-emerald-400 mb-1">Payment Confirmed! 🎉</p>
            <p className="text-sm text-violet-300/80">{totalSQ} SQ has been added to your balance.</p>
          </div>
          {reference && (
            <a
              href={`/receipt/${encodeURIComponent(reference)}`}
              className="w-full text-center py-3 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-bold hover:bg-violet-500/20 transition-all flex items-center justify-center gap-2"
            >
              🧾 Download receipt
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold hover:from-emerald-400 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-emerald-500/30"
          >
            Done
          </button>
        </div>
      );
    }

    if (stage === "failed") {
      return (
        <div className="flex flex-col items-center gap-5 py-8">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center shadow-xl shadow-red-500/20">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-xl text-red-400 mb-1">Payment Failed</p>
            <p className="text-sm text-violet-300/80">{failReason || "Please try again."}</p>
            <p className="text-xs text-violet-400/60 mt-2">No SQ was charged. Please try again.</p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => {
                setStage("select");
                setFailReason("");
                setReference("");
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold hover:from-violet-400 hover:to-fuchsia-400 transition-all duration-300"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-violet-500/30 text-sm font-bold hover:bg-violet-500/10 transition-colors text-violet-300"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (stage === "pending") {
      return (
        <div className="flex flex-col items-center gap-5 py-8">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/30 flex items-center justify-center shadow-xl shadow-violet-500/20">
              <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-white mb-1">Waiting for payment...</p>
            <p className="text-sm text-violet-300/80">{gatewayMessage || message}</p>
            <p className="text-xs text-violet-400/60 mt-2 font-mono">Order ID: <span className="font-semibold">{reference}</span></p>
            {gatewayStatus && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-300">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Status: {gatewayStatus}
              </p>
            )}
            <p className="text-xs text-violet-400/60 mt-3">Check your phone and enter your PIN</p>
          </div>

          <div className="w-full bg-violet-500/10 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (pollCount / 40) * 100)}%` }} />
          </div>
          <p className="text-xs text-violet-400/60 font-medium">This may take up to 2 minutes.</p>
          
          <p className="text-[10px] text-violet-500/50 font-medium mt-2">
            ⏳ Please wait while we confirm your payment...
          </p>
          
          <a 
            href={`https://wa.me/${WHATSAPP_NUMBER}`} 
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-violet-400/50 hover:text-violet-400 transition-colors font-medium"
          >
            Need help? Contact support
          </a>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {pkg ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-violet-500/20 shadow-lg shadow-violet-500/10">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">{pkg.name}</span>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-lg text-violet-300">{totalSQ} SQ</span>
              </div>
            </div>
            <p className="text-xs text-violet-400/70 mt-1">
              {country.code === "TZ" 
                ? `TSh ${pkg.tzsPrice.toLocaleString()}`
                : `${country.symbol} ${(pkg.tzsPrice / country.rate).toFixed(2)}`
              }
              <span className="text-violet-400/50 ml-1">(TZS {pkg.tzsPrice.toLocaleString()})</span>
            </p>
            {isBelowMinimum && (
              <p className="text-[10px] text-red-400 mt-2 font-semibold">
                ⚠️ Minimum deposit is {MINIMUM_SQ} SQ ({MINIMUM_TZS.toLocaleString()} TZS)
              </p>
            )}
          </div>
        ) : (
          <CurrencyCalculator 
            country={country}
            initialSQ={sqAmount}
            onAmountChange={(sq, local) => {
              onAmountChange(sq, local);
            }}
          />
        )}

        {isTanzania ? (
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5 space-y-4 shadow-lg shadow-violet-500/5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/30 shadow-lg shadow-violet-500/20">
                <Smartphone className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Pay with Mobile Money / Bank</p>
                <p className="text-xs text-violet-400/70">M-Pesa · Tigo · Airtel · Halotel · CRDB · NMB</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="tel"
                placeholder="Phone (0712345678 or 255712345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f]/50 border border-violet-500/20 text-white text-sm placeholder:text-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
              />
              <p className="text-[10px] text-violet-400/50 font-medium">Enter phone number with 255 or 0</p>
              
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setProvider(method.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all duration-300 ${
                      provider === method.id
                        ? "border-violet-500/60 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 shadow-lg shadow-violet-500/20"
                        : "border-violet-500/15 hover:border-violet-500/40 hover:bg-violet-500/5"
                    }`}
                  >
                    <img 
                      src={method.logo} 
                      alt={method.label} 
                      className="w-10 h-10 rounded-full object-contain bg-white/5 p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
                      }}
                    />
                    <span className="text-[10px] text-violet-300 text-center font-semibold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
              <p className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Promo code
              </p>
              {promo ? (
                <div className="flex items-center justify-between gap-2 bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                  <div className="text-xs">
                    <span className="font-mono font-bold text-emerald-400">{promo.code}</span>
                    <span className="text-emerald-400/80 ml-2">-{promo.discountPercent}% (TZS {promo.discount.toLocaleString()})</span>
                  </div>
                  <button
                    onClick={() => { setPromo(null); setPromoInput(""); }}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[#0a0a0f]/50 border border-violet-500/20 text-white text-sm placeholder:text-violet-400/30 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={async () => {
                      if (!promoInput.trim()) return;
                      setPromoChecking(true);
                      const res = await validatePromo(promoInput.trim(), tzsAmount, "topup");
                      setPromoChecking(false);
                      if (res?.error || !res?.ok) {
                        showToast(res?.error || "Invalid promo code", "error");
                        return;
                      }
                      setPromo({ code: res.code!, discountPercent: res.discountPercent!, discount: res.discount! });
                      showToast(`Promo ${res.code} applied - ${res.discountPercent}% off`, "success");
                    }}
                    disabled={promoChecking}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 text-violet-300 text-sm font-bold disabled:opacity-50 hover:from-violet-500/30 hover:to-fuchsia-500/30 transition-all"
                  >
                    {promoChecking ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {promo && (
                <div className="flex justify-between text-xs pt-2 border-t border-violet-500/20">
                  <span className="text-violet-300/70 font-medium">Total to pay</span>
                  <span className="font-bold text-emerald-400 text-sm">TZS {payableTzs.toLocaleString()}</span>
                </div>
              )}
            </div>

            <button
              onClick={handlePayment}
              disabled={loading || isBelowMinimum || isProcessing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {loading ? "Processing..." : `Pay TZS ${payableTzs.toLocaleString()}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-5 text-center shadow-lg shadow-amber-500/10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
              <Globe className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-sm text-amber-300 font-semibold mb-1">
              💳 Mobile Money & Bank available for Tanzania only
            </p>
            <p className="text-xs text-amber-400/70">
              Please use Minipay or Crypto options below.
            </p>
          </div>
        )}
      </div>
    );
  }, [stage, pkg, totalSQ, country, sqAmount, onAmountChange, isBelowMinimum, phone, provider, loading, isProcessing, promo, promoInput, promoChecking, payableTzs, reference, gatewayStatus, gatewayMessage, message, pollCount, failReason, handlePayment, onClose, showToast]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Complete Payment" maxWidth="max-w-sm">
      {modalContent}
    </Modal>
  );
}

// ============================================================
// MAIN TOPUP PAGE
// ============================================================
export default function TopUp() {
  const { user, loading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { navigateWithLoader } = useNavLoader();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualMethod, setManualMethod] = useState<"minipay" | "btc" | "bnb">("minipay");
  const [sqAmount, setSqAmount] = useState(10);

  const manualDetails = {
    minipay: {
      number: "+255787069580",
      name: MINIPAY_NAME
    },
    btc: {
      address: "bc1qps8kp0kcfhn6ky8ngqs8tmz58m9lrhrw79xdzm"
    },
    bnb: {
      address: "0x9fafbe3e6e6607397342fbecbe4d6105f7240ef7"
    }
  };

  useEffect(() => {
    const status = searchParams.get("status");
    const ref = searchParams.get("ref");
    if (status === "success" && ref) {
      showToast("Payment confirmed! SQ added to your balance.", "success");
      refreshUser();
    } else if (status === "failed") {
      showToast("Payment failed or was cancelled.", "error");
    }
  }, [searchParams, showToast, refreshUser]);

  // ============================================================
  // FIX: Recalculate package prices with 1 SQ = 100 TZS
  // ============================================================
  useEffect(() => {
    getPackages()
      .then((data) => {
        const packagesFromServer = data as Package[];
        
        // FIX: Override TZS prices with correct calculation
        const fixedPackages = packagesFromServer.map(pkg => {
          const totalSQ = pkg.txAmount + (pkg.bonusTx || 0);
          // 1 SQ = 100 TZS
          const correctPrice = totalSQ * SQ_RATE_TZS;
          
          return {
            ...pkg,
            tzsPrice: Math.max(correctPrice, MINIMUM_TZS),
            txAmount: Math.max(pkg.txAmount, MINIMUM_SQ),
          };
        });
        
        const sorted = fixedPackages.sort((a, b) => a.order - b.order);
        setPackages(sorted);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load packages";
        showToast(cleanErrorMessage(message), "error");
      })
      .finally(() => setPkgLoading(false));
  }, [showToast]);

  const handleManualPay = useCallback((method: "minipay" | "btc" | "bnb") => {
    setManualMethod(method);
    setManualModalOpen(true);
  }, []);

  const handleAmountChange = useCallback((sq: number) => {
    setSqAmount(sq);
  }, []);

  const handlePackageSelect = useCallback((pkg: Package) => {
    const meetsMinimum = pkg.tzsPrice >= MINIMUM_TZS && (pkg.txAmount + pkg.bonusTx) >= MINIMUM_SQ;
    if (!meetsMinimum) {
      showToast(`Minimum deposit is ${MINIMUM_SQ} SQ (${MINIMUM_TZS.toLocaleString()} TZS).`, "error");
      return;
    }
    setSelectedPkg(pkg);
    setModalOpen(true);
  }, [showToast]);

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <TechBackground />
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10"
            style={{
              width: Math.random() * 5 + 2 + 'px',
              height: Math.random() * 5 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float-particle ${Math.random() * 15 + 12}s linear infinite`,
              animationDelay: Math.random() * 15 + 's',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(139,92,246,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0px) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
          }
          @keyframes slide-down {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-down {
            animation: slide-down 0.3s ease-out forwards;
          }
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .text-gradient-premium {
            background: linear-gradient(135deg, #a855f7, #ec4899, #a855f7);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradient-shift 3s ease infinite;
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer {
            background: linear-gradient(90deg, transparent 25%, rgba(168,85,247,0.1) 50%, transparent 75%);
            background-size: 200% 100%;
            animation: shimmer 3s infinite;
          }
        `}</style>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigateWithLoader("/dashboard")}
            className="p-2.5 rounded-xl hover:bg-violet-500/10 transition-all duration-300 text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Top Up <span className="text-gradient-premium">SQ</span>
              </h1>
              <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
            <p className="text-sm text-violet-300/70 font-medium">Add SQ coins to your account · Instant activation</p>
          </div>
          {user && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/30 shadow-lg shadow-violet-500/10">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/30">
                <Coins className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-violet-400/70 font-bold uppercase tracking-wider">Balance</span>
                <span className="font-bold text-base text-white">{user.txCoins} SQ</span>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 border border-violet-500/20 shadow-lg shadow-violet-500/5 relative overflow-hidden">
          <div className="absolute inset-0 shimmer pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/30 shadow-lg shadow-violet-500/20">
              <Crown className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                Premium Exchange Rates
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
              </p>
              <p className="text-xs text-violet-400/70 mt-0.5">
                Best rates across Africa · 6+ countries supported
              </p>
            </div>
          </div>
        </div>

        <div className="relative mb-6">
          <button
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 hover:from-violet-500/15 hover:to-fuchsia-500/10 transition-all shadow-lg shadow-violet-500/5 hover:shadow-violet-500/15 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 flex items-center justify-center border border-violet-500/30 text-2xl shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
                {selectedCountry.flag}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">{selectedCountry.name}</p>
                <p className="text-xs text-violet-400/70 font-medium">1 SQ = {selectedCountry.symbol}{selectedCountry.rate.toFixed(2)}</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-violet-400 transition-transform duration-300 ${showCountryDropdown ? "rotate-180" : ""}`} />
          </button>
          
          {showCountryDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-500/20 max-h-64 overflow-y-auto backdrop-blur-xl">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country);
                    setShowCountryDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-500/10 transition-all ${
                    selectedCountry.code === country.code ? "bg-violet-500/15 border-l-4 border-violet-500" : "border-l-4 border-transparent"
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <div className="text-left flex-1">
                    <span className="text-sm font-bold text-white">{country.name}</span>
                    <span className="text-xs text-violet-400/70 block">{country.currency}</span>
                  </div>
                  <span className="text-xs text-violet-300 font-mono font-semibold">{country.symbol}{country.rate.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <PayPalTopUp />
        </div>

        {pkgLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500/30 blur-2xl rounded-full animate-pulse" />
                <Loader2 className="w-14 h-14 animate-spin text-violet-400 relative" />
              </div>
              <p className="text-sm text-violet-300/70 animate-pulse font-medium">Loading packages...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3">
              {packages.map((pkg) => {
                const total = (pkg.txAmount || 0) + (pkg.bonusTx || 0);
                const meetsMinimum = pkg.tzsPrice >= MINIMUM_TZS && total >= MINIMUM_SQ;
                
                return (
                  <div
                    key={pkg._id}
                    className={`relative w-full p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 ${
                      pkg.isBestDeal 
                        ? "border-violet-500/50 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 shadow-xl shadow-violet-500/20" 
                        : "border-violet-500/15 bg-gradient-to-br from-[#0a0a0f]/80 to-[#1a1a2e]/60 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10"
                    } ${!meetsMinimum ? "opacity-50" : ""}`}
                  >
                    {pkg.isBestDeal && meetsMinimum && (
                      <span className="absolute -top-2.5 right-3 px-3 py-1 text-[10px] font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full uppercase tracking-wider shadow-lg shadow-violet-500/40 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Best Deal
                      </span>
                    )}
                    {!meetsMinimum && (
                      <span className="absolute -top-2.5 left-3 px-3 py-1 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full uppercase tracking-wider shadow-lg">
                        BELOW MIN
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-base">{pkg.name}</p>
                        <p className="text-sm text-violet-400/80 mt-1 font-medium">
                          {pkg.txAmount} SQ{pkg.bonusTx > 0 ? ` + ${pkg.bonusTx} bonus` : ""}
                          {!meetsMinimum && (
                            <span className="text-red-400 text-[10px] ml-2 font-semibold">
                              (Min {MINIMUM_SQ} SQ / {MINIMUM_TZS.toLocaleString()} TZS)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end mb-1">
                          {pkg.isBestDeal && meetsMinimum && <Sparkles className="w-4 h-4 text-violet-400" />}
                          <p className="text-2xl font-bold text-gradient-premium">{total}</p>
                          <span className="text-sm font-bold text-violet-300">SQ</span>
                        </div>
                        <p className="text-sm text-violet-400/70 font-medium">
                          {selectedCountry.code === "TZ" 
                            ? `TSh ${pkg.tzsPrice.toLocaleString()}`
                            : `${selectedCountry.symbol} ${(pkg.tzsPrice / selectedCountry.rate).toFixed(2)}`
                          }
                          <span className="text-violet-400/40 text-[10px] ml-1">
                            (TZS {pkg.tzsPrice.toLocaleString()})
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handlePackageSelect(pkg)}
                        className={`px-5 py-2 rounded-xl text-white text-sm font-bold transition-all duration-300 shadow-lg flex items-center gap-2 ${
                          pkg.isBestDeal && meetsMinimum
                            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 shadow-violet-500/40 hover:shadow-violet-500/60" 
                            : meetsMinimum
                            ? "bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-500/30"
                            : "bg-gray-500/50 cursor-not-allowed"
                        }`}
                        disabled={!meetsMinimum}
                      >
                        <Zap className="w-4 h-4" />
                        Purchase
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-2 border-dashed border-violet-500/30 rounded-2xl p-5 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/30 shadow-lg shadow-violet-500/20">
                    <Calculator className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Custom Amount</p>
                    <p className="text-sm text-violet-400/70">Choose exactly how many SQ you need</p>
                  </div>
                </div>
                <button
                  onClick={() => setCustomModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 hover:from-violet-500/30 hover:to-fuchsia-500/30 text-violet-300 text-sm font-bold transition-all border border-violet-500/30 hover:border-violet-500/50 flex items-center gap-2 shadow-lg shadow-violet-500/10"
                >
                  <Calculator className="w-4 h-4" />
                  Open Calculator
                </button>
              </div>
              
              <div className="bg-[#0a0a0f]/50 rounded-xl p-3 border border-violet-500/15">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-violet-400/80 font-semibold">1 SQ = {selectedCountry.symbol} {selectedCountry.rate.toFixed(2)}</span>
                  <span className="text-violet-400/80 font-semibold">Min {MINIMUM_SQ} SQ</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5 shadow-lg shadow-violet-500/5">
              <MinipayPaymentSection onManualPay={handleManualPay} />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center border border-emerald-500/30">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xs text-emerald-300 font-bold text-center">Secure Payments</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs text-blue-300 font-bold text-center">Instant Activation</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/30 to-violet-600/20 flex items-center justify-center border border-violet-500/30">
                  <Globe className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-xs text-violet-300 font-bold text-center">6+ Countries</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        pkg={selectedPkg}
        country={selectedCountry}
        sqAmount={sqAmount}
        onAmountChange={handleAmountChange}
        onSuccess={() => {
          refreshUser();
          setModalOpen(false);
        }}
      />

      <PaymentModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        pkg={null}
        country={selectedCountry}
        sqAmount={sqAmount}
        onAmountChange={handleAmountChange}
        onSuccess={() => {
          refreshUser();
          setCustomModalOpen(false);
        }}
      />

      <ManualPaymentModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        method={manualMethod}
        details={manualDetails[manualMethod]}
        onSuccess={() => {
          refreshUser();
          setManualModalOpen(false);
        }}
      />
    </div>
  );
}