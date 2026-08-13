import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deployBot } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { useNavLoader } from "@/App";
import {
  ArrowLeft, ExternalLink, Loader2, Check, CreditCard,
  Smartphone, Apple, Sparkles, KeyRound, Hash, Rocket,
  ChevronRight, Copy, Info, AlertCircle, Heart
} from "lucide-react";

const DEPLOY_COST = 10;

function sanitizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

function buildAppName(name: string): string {
  const clean = sanitizeName(name);
  const rand = Math.floor(100 + Math.random() * 900);
  return `stanyhost-${clean}${rand}`;
}

// ===== STEP BADGE PINK =====
function StepBadge({ number }: { number: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 flex items-center justify-center text-sm font-bold shrink-0 text-white shadow-lg shadow-pink-500/30">
      {number}
    </div>
  );
}

// ===== PINK BUTTON =====
function PinkButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={`
        relative overflow-hidden bg-gradient-to-r from-pink-500 to-pink-600 
        hover:from-pink-400 hover:to-pink-500 text-white font-semibold 
        shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 
        transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97]
        rounded-xl border border-pink-400/20 px-5 py-2.5 h-12 text-base
        ${className || ""}
      `}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    </Button>
  );
}

// ===== ANIMATED LOGO =====
function AnimatedLogo() {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-500" />
      <img
        src="https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg"
        alt="STANY Host"
        className="relative w-9 h-9 rounded-xl object-cover ring-2 ring-pink-400/50 shadow-lg shadow-pink-500/20"
      />
      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-400 rounded-full animate-pulse ring-2 ring-[#0a0a0f]" />
    </div>
  );
}

export function Deploy() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [botName, setBotName] = useState("");
  const [sessionVar, setSessionVar] = useState("");
  const [device, setDevice] = useState("android");
  const [isTrial, setIsTrial] = useState(() => searchParams.get("trial") === "true");
  const [loading, setLoading] = useState(false);

  const getSessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  if (authLoading) return <PageLoader />;
  if (!user) return null;

  const coinBalance = user.txCoins;
  const insufficientBalance = !isTrial && coinBalance < DEPLOY_COST;

  const handleDeploy = async () => {
    if (insufficientBalance) {
      navigateWithLoader("/topup");
      return;
    }
    const nameTrimmed = botName.trim();
    if (sanitizeName(nameTrimmed).length < 5) {
      showToast("Name must have at least 5 letters (a-z)", "error");
      return;
    }
    const trimmedSession = sessionVar.trim();
    if (!trimmedSession) {
      showToast("Session ID is required — get it from Step 1 above", "error");
      getSessionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const appName = buildAppName(nameTrimmed);
    setLoading(true);
    try {
      const res = await deployBot({
        botName: appName,
        sessionVar: trimmedSession,
        isTrial,
        device,
        months: 1,
      });
      if (res.success) {
        showToast(isTrial ? "Trial bot deployed!" : "Bot deployed! Building in ~2 minutes...", "success");
        const finalName = res.bot?.herokuAppName || appName;
        localStorage.setItem("deployingBot", JSON.stringify({ appName: finalName, startTime: Date.now() }));
        refreshUser();
        navigate("/mybots");
      } else {
        if (res.code === "INSUFFICIENT_COINS") {
          showToast("Insufficient SQ Coins — redirecting to Top Up", "error");
          navigateWithLoader("/topup");
        } else {
          showToast(res.error || "Failed to deploy bot", "error");
        }
      }
    } catch {
      showToast("Failed to deploy bot", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      {/* ===== LOADING OVERLAY ===== */}
      {loading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[#0a0a0f]/90">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-pink-500/20 border-t-pink-400 animate-spin" />
            <Rocket className="w-6 h-6 text-pink-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-white">Deploying your bot...</p>
            <p className="text-sm text-pink-400/70">Building takes about 2 minutes. Please wait.</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-pink-400"
                  style={{
                    animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <TechBackground />

      {/* ===== PARTICLES ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-pink-500/5"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float-particle ${Math.random() * 12 + 10}s linear infinite`,
              animationDelay: Math.random() * 12 + 's',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,142,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0px) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
          }
          @keyframes typing-dot {
            0%, 100% { transform: scale(0.5); opacity: 0.3; }
            50% { transform: scale(1.2); opacity: 1; }
          }
        `}</style>
      </div>

      {/* ===== NAVBAR ===== */}
      <nav className="border-b border-pink-500/10 sticky top-0 bg-[#0a0a0f]/80 z-50 shadow-lg shadow-pink-500/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-3">
            <button
              onClick={() => navigateWithLoader("/services/bots")}
              className="p-2.5 -ml-2 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400 hover:text-pink-300"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <AnimatedLogo />
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">Deploy STANY MD</h1>
              <p className="text-xs text-pink-400/60">Follow the steps below carefully</p>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 relative z-[1] space-y-6 pb-24">

        {/* ===== FREE TRIAL BUTTON ===== */}
        <button
          type="button"
          onClick={() => setIsTrial(!isTrial)}
          className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group ${
            isTrial
              ? "bg-gradient-to-r from-pink-500/20 to-pink-600/15 border-pink-500/70 shadow-lg shadow-pink-500/20"
              : "bg-gradient-to-r from-pink-500/8 to-pink-600/5 border-pink-500/30 hover:border-pink-500/60 hover:from-pink-500/15 hover:to-pink-600/10"
          }`}
        >
          {!isTrial && (
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: "2s" }} />
          )}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            isTrial ? "bg-pink-500/30 group-hover:bg-pink-500/40" : "bg-pink-500/15 group-hover:bg-pink-500/25"
          }`}>
            <Sparkles className={`w-6 h-6 ${isTrial ? "text-pink-300" : "text-pink-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-bold ${isTrial ? "text-pink-200" : "text-white"}`}>Free Trial — 24 Hours</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 to-pink-600 text-white leading-none shrink-0 shadow-lg shadow-pink-500/30">
                FREE
              </span>
            </div>
            <p className={`text-xs mt-1 ${isTrial ? "text-pink-300/80" : "text-pink-400/60"}`}>
              No SQ coins required · Runs for 24 hours · One per WhatsApp number
            </p>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-300 ${
            isTrial ? "bg-pink-500 border-pink-500 shadow-lg shadow-pink-500/30" : "border-pink-500/40 group-hover:border-pink-500/70"
          }`}>
            {isTrial && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
        </button>

        {/* ===== STEP 1: SESSION ID ===== */}
        <div ref={getSessionRef} className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-pink-500/10 bg-pink-500/5">
            <StepBadge number={1} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Get Your Session ID</p>
              <p className="text-xs text-pink-400/60">You must do this before deploying</p>
            </div>
            <KeyRound className="w-4 h-4 text-pink-400/50 shrink-0" />
          </div>
          <div className="p-4 space-y-4">
            <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-200 space-y-1">
                <p className="font-semibold text-blue-300">What is a Session ID?</p>
                <p>A Session ID connects your WhatsApp account to the bot. You get it by scanning a QR code or entering a pairing code on the session generator page.</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-pink-400/60 mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                A valid Session ID looks like this:
              </p>
              <div className="bg-[#0a0a0f] rounded-xl p-3 font-mono text-xs text-pink-400/70 break-all leading-relaxed border border-pink-500/10 select-all">
                Stanytz378/iamlegendv2_xxx
              </div>
              <p className="text-xs text-pink-400/50 mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                It is a long string — make sure you copy the <span className="font-semibold text-white mx-0.5">entire</span> value
              </p>
            </div>

            <a
              href="toxicx.tech/pairing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full p-4 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold text-sm hover:from-pink-400 hover:to-pink-500 transition-all duration-300 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4" />
                Get Session ID from generator
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </a>

            <ol className="space-y-1.5 text-xs text-pink-400/60">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-pink-400">1</span>
                Open the link above
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-pink-400">2</span>
                Enter your WhatsApp number or scan the QR code
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-pink-400">3</span>
                Copy the <span className="font-semibold text-white mx-0.5">full</span> session string that appears
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-pink-400">4</span>
                Come back here and paste it in Step 3 below
              </li>
            </ol>
          </div>
        </div>

        {/* ===== STEP 2: BOT NAME ===== */}
        <div className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-pink-500/10 bg-pink-500/5">
            <StepBadge number={2} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Bot Name</p>
              <p className="text-xs text-pink-400/60">At least 5 letters — used to identify your bot</p>
            </div>
            <Smartphone className="w-4 h-4 text-pink-400/50 shrink-0" />
          </div>
          <div className="p-4">
            <Label htmlFor="botname" className="text-pink-400/70">Name</Label>
            <Input
              id="botname"
              placeholder="e.g. mybot or johnbot"
              value={botName}
              onChange={e => setBotName(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              maxLength={20}
              className="mt-1 border-pink-500/20 focus:ring-pink-500/30 focus:border-pink-500/50 bg-[#0a0a0f]/50 text-white placeholder:text-pink-400/40"
            />
            {botName && (
              <p className="text-xs text-pink-400/50 mt-1.5 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                App name: <span className="font-mono text-pink-400 ml-1">stanyhost-{sanitizeName(botName)}###</span>
              </p>
            )}
          </div>
        </div>

        {/* ===== STEP 3: SESSION ID PASTE ===== */}
        <div className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-pink-500/10 bg-pink-500/5">
            <StepBadge number={3} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Paste Your Session ID</p>
              <p className="text-xs text-pink-400/60">Copied from Step 1 above</p>
            </div>
            <Copy className="w-4 h-4 text-pink-400/50 shrink-0" />
          </div>
          <div className="p-4 space-y-3">
            <div>
              <Label htmlFor="session" className="text-pink-400/70">Session ID</Label>
              <textarea
                id="session"
                placeholder="Paste your full session ID here — e.g. Stanytz378/iamlegendv2_xxx"
                value={sessionVar}
                onChange={e => setSessionVar(e.target.value)}
                rows={4}
                className="mt-1 w-full min-h-[100px] rounded-xl border border-pink-500/20 bg-[#0a0a0f]/50 px-3 py-2 text-sm font-mono text-white resize-y placeholder:text-pink-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/30 focus-visible:border-pink-500/50 transition-colors"
              />
            </div>
            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 space-y-0.5">
                <p className="font-semibold text-amber-300">Paste the complete string</p>
                <p>A valid Session ID is long. If it looks short, go back to Step 1 and copy the full value.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== STEP 4: DEVICE MODE ===== */}
        <div className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-pink-500/10 bg-pink-500/5">
            <StepBadge number={4} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Device Mode</p>
              <p className="text-xs text-pink-400/60">How the bot appears to other users</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <Select value={device} onValueChange={setDevice}>
              <SelectTrigger className="w-full h-10 border-pink-500/20 focus:ring-pink-500/30 bg-[#0a0a0f]/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" className="bg-[#0a0a0f] border-pink-500/20">
                <SelectItem value="android" className="text-white hover:bg-pink-500/10 focus:bg-pink-500/10">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-green-400" />
                    Android
                  </div>
                </SelectItem>
                <SelectItem value="ios" className="text-white hover:bg-pink-500/10 focus:bg-pink-500/10">
                  <div className="flex items-center gap-2">
                    <Apple className="w-3.5 h-3.5 text-blue-400" />
                    iOS
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className={`p-3 rounded-xl border text-xs ${device === "android" ? "bg-green-500/8 border-green-500/20 text-green-300" : "bg-blue-500/8 border-blue-500/20 text-blue-300"}`}>
              {device === "android" ? (
                <div className="flex items-start gap-2">
                  <Smartphone className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-400" />
                  <span><span className="font-semibold">Android mode</span> — Full interactive experience. Bot sends interactive buttons, menus, and quick-reply options in chats.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Apple className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
                  <span><span className="font-semibold">iOS mode</span> — Text-only. No interactive buttons are sent. Commands still work but responses are plain text.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== COST CARD ===== */}
        {!isTrial && (
          <div className={`p-5 rounded-2xl border text-sm transition-all duration-300 ${insufficientBalance ? "bg-red-500/10 border-red-500/30" : "bg-[#0a0a0f]/50 border-pink-500/10"}`}>
            <div className="flex justify-between items-center">
              <span className="text-pink-400/60">Cost (1 month)</span>
              <span className={`font-semibold ${insufficientBalance ? "text-red-400" : "text-pink-400"}`}>{DEPLOY_COST} SQ</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-pink-400/60">Your balance</span>
              <span className={`font-semibold ${insufficientBalance ? "text-red-400" : "text-pink-400"}`}>{coinBalance} SQ</span>
            </div>
            {insufficientBalance && (
              <p className="text-xs mt-3 text-red-400">
                You need {DEPLOY_COST - coinBalance} more SQ to deploy.{" "}
                <button onClick={() => navigateWithLoader("/topup")} className="underline font-semibold hover:text-red-300 transition-colors">Top up now →</button>
              </p>
            )}
          </div>
        )}

        {/* ===== DEPLOY BUTTON - IMPROVED ===== */}
        <PinkButton
          className={`w-full h-14 text-lg font-bold ${insufficientBalance ? "opacity-70" : ""}`}
          onClick={handleDeploy}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Deploying...</>
          ) : insufficientBalance ? (
            <><CreditCard className="w-5 h-5 mr-2" />Top Up — Insufficient Balance</>
          ) : (
            <><Rocket className="w-5 h-5 mr-2" />{isTrial ? "Deploy Free Trial" : `Deploy Bot — ${DEPLOY_COST} SQ / month`}</>
          )}
        </PinkButton>

        {/* ===== FOOTER ===== */}
        <div className="pt-4 text-center">
          <p className="text-xs text-pink-400/30">
            Made with <Heart className="w-3 h-3 inline text-pink-400 animate-heartbeat" /> by STANY
          </p>
        </div>
      </main>

      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.2); }
          28% { transform: scale(1); }
          42% { transform: scale(1.1); }
          70% { transform: scale(1); }
        }
        .animate-heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}