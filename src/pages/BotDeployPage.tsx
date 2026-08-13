import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deployBotWithTemplate } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { useNavLoader } from "@/App";
import { Modal } from "@/components/Modal";
import type { BotTemplate } from "@/types";
import { getBotTemplateBySlug } from "@/lib/api";
import {
  ArrowLeft, ExternalLink, Loader2, Check,
  Smartphone, Apple, Rocket, ChevronRight, ClipboardPaste,
  Info, AlertCircle, ChevronDown, KeyRound, Hash,
  Heart
} from "lucide-react";

const DEPLOY_COST = 10;
const AUTO_VARS = new Set(["BOT_NAME", "HEROKU_APP_NAME", "HEROKU_API_KEY", "DEVICE"]);
const SESSION_KEYS = ["SESSION", "CREDS", "SESSION_ID", "SESSION_TOKEN", "AUTH"];
const SENSITIVE_KEYS = new Set(["HEROKU_API_KEY", "SESSION", "CREDS", "SESSION_ID", "SESSION_TOKEN", "AUTH", "API_KEY", "SECRET", "PASSWORD", "TOKEN"]);

// ===== STEP BADGE PINK =====
function StepBadge({ number }: { number: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 flex items-center justify-center text-sm font-bold shrink-0 text-white shadow-lg shadow-pink-500/30">
      {number}
    </div>
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

// ===== PINK BUTTON =====
function PinkButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={`
        relative overflow-hidden bg-gradient-to-r from-pink-500 to-pink-600 
        hover:from-pink-400 hover:to-pink-500 text-white font-semibold 
        shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 
        transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97]
        rounded-xl border border-pink-400/20 px-5 py-2.5
        ${className || ""}
      `}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    </Button>
  );
}

function sanitizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

function buildAppName(name: string): string {
  const clean = sanitizeName(name);
  const rand = Math.floor(100 + Math.random() * 900);
  return `stanyhost-${clean}${rand}`;
}

interface AppJsonEnvVar {
  description: string;
  required: boolean;
  value: string;
}

export function BotDeployPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();

  const [template, setTemplate] = useState<BotTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [botName, setBotName] = useState("");
  const [sessionVar, setSessionVar] = useState("");
  const [device, setDevice] = useState("android");
  const [loading, setLoading] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [lowBalanceModal, setLowBalanceModal] = useState(false);

  const [appJsonEnv, setAppJsonEnv] = useState<Record<string, AppJsonEnvVar>>({});
  const [requiredVarValues, setRequiredVarValues] = useState<Record<string, string>>({});
  const [optionalVarValues, setOptionalVarValues] = useState<Record<string, string>>({});
  const [loadingAppJson, setLoadingAppJson] = useState(false);

  const getSessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!slug || authLoading) return;
    getBotTemplateBySlug(slug)
      .then(data => {
        if (data && !data.error) setTemplate(data);
        else navigate("/services/bots");
      })
      .catch(() => navigate("/services/bots"))
      .finally(() => setLoadingTemplate(false));
  }, [slug, navigate, authLoading]);

  useEffect(() => {
    if (!template || template.isDefault) return;
    const match = template.githubRepo.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return;
    const [, owner, repoName] = match;
    const cleanRepo = repoName.replace(/\.git$/, "");
    setLoadingAppJson(true);
    (async () => {
      const branches = ["main", "master", "HEAD"];
      let appJson: { env?: Record<string, { description?: string; required?: boolean; value?: string }> } | null = null;
      for (const branch of branches) {
        try {
          const r = await fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/app.json`);
          if (r.ok) { appJson = await r.json(); break; }
        } catch { }
      }
      if (appJson?.env) {
        const filtered: Record<string, AppJsonEnvVar> = {};
        const reqVals: Record<string, string> = {};
        const optVals: Record<string, string> = {};
        for (const [k, v] of Object.entries(appJson.env)) {
          if (AUTO_VARS.has(k)) continue;
          const isReq = v.required !== false;
          const defaultVal = v.value || "";
          filtered[k] = { description: v.description || "", required: isReq, value: defaultVal };
          if (isReq) reqVals[k] = defaultVal;
          else optVals[k] = defaultVal;
        }
        setAppJsonEnv(filtered);
        setRequiredVarValues(reqVals);
        setOptionalVarValues(optVals);
      }
      setLoadingAppJson(false);
    })();
  }, [template]);

  if (authLoading || loadingTemplate) return <PageLoader />;
  if (!user || !template) return <PageLoader />;

  const cost = template.costTx ?? DEPLOY_COST;
  const insufficientBalance = user.txCoins < cost;

  const requiredKeys = Object.entries(appJsonEnv).filter(([, v]) => v.required).map(([k]) => k);
  const optionalKeys = Object.entries(appJsonEnv).filter(([, v]) => !v.required).map(([k]) => k);

  const handleDeploy = async () => {
    if (insufficientBalance) { setLowBalanceModal(true); return; }
    const nameTrimmed = botName.trim();
    if (sanitizeName(nameTrimmed).length < 5) { showToast("Name must have at least 5 letters (a-z)", "error"); return; }

    if (template.isDefault) {
      const trimmedSession = sessionVar.trim();
      if (!trimmedSession) {
        showToast("Session ID is required", "error");
        getSessionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const appName = buildAppName(nameTrimmed);
      setLoading(true);
      try {
        const res = await deployBotWithTemplate({ botTemplateId: template._id, botName: appName, sessionVar: trimmedSession, device, months: 1 }) as { success?: boolean; error?: string; code?: string; bot?: { herokuAppName: string } };
        if (res.success) {
          showToast("Bot deployed! Building in ~2 minutes...", "success");
          localStorage.setItem("deployingBot", JSON.stringify({ appName: res.bot?.herokuAppName || appName, startTime: Date.now() }));
          await refreshUser();
          navigate("/mybots");
        } else if (res.code === "INSUFFICIENT_COINS") {
          setLowBalanceModal(true);
        } else {
          showToast(res.error || "Deployment failed", "error");
        }
      } catch { showToast("Deployment failed — please try again", "error"); }
      finally { setLoading(false); }
    } else {
      const missingRequired = requiredKeys.filter(k => !requiredVarValues[k]?.trim());
      if (missingRequired.length > 0) { showToast(`Please fill in: ${missingRequired.join(", ")}`, "error"); return; }

      const allVars: Record<string, string> = {};
      for (const [k, v] of Object.entries(requiredVarValues)) { if (v.trim()) allVars[k] = v.trim(); }
      for (const [k, v] of Object.entries(optionalVarValues)) { if (v.trim()) allVars[k] = v.trim(); }

      const sessionKey = Object.keys(allVars).find(k => SESSION_KEYS.includes(k.toUpperCase()));
      const sessionValue = sessionKey ? allVars[sessionKey] : (Object.values(allVars)[0] || "placeholder");

      const appName = buildAppName(nameTrimmed);
      setLoading(true);
      try {
        const res = await deployBotWithTemplate({ botTemplateId: template._id, botName: appName, sessionVar: sessionValue, device, months: 1, extraVars: allVars }) as { success?: boolean; error?: string; code?: string; bot?: { herokuAppName: string } };
        if (res.success) {
          showToast("Bot deployed! Building in ~2 minutes...", "success");
          localStorage.setItem("deployingBot", JSON.stringify({ appName: res.bot?.herokuAppName || appName, startTime: Date.now() }));
          await refreshUser();
          navigate("/mybots");
        } else if (res.code === "INSUFFICIENT_COINS") {
          setLowBalanceModal(true);
        } else {
          showToast(res.error || "Deployment failed", "error");
        }
      } catch { showToast("Deployment failed — please try again", "error"); }
      finally { setLoading(false); }
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
        {[...Array(15)].map((_, i) => (
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
          <div className="flex items-center gap-3 h-16">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2.5 -ml-2 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400 hover:text-pink-300"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <AnimatedLogo />
            <div>
              <p className="font-semibold text-sm text-white">{template.name}</p>
              <p className="text-xs text-pink-400/60">Deploy Bot</p>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5 relative z-[1]">
        {/* ===== BANNER IMAGE ===== */}
        {template.imageUrl && (
          <div className="rounded-2xl overflow-hidden aspect-video max-h-48 border border-pink-500/10 shadow-lg shadow-pink-500/5">
            <img src={template.imageUrl} alt={template.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* ===== COST CARD ===== */}
        <div className={`p-5 rounded-2xl border ${insufficientBalance ? "border-red-500/30 bg-red-500/5" : "border-pink-500/10 bg-[#0a0a0f]/50"}`}>
          <div className="flex justify-between items-center">
            <span className="text-pink-400/60 text-sm">Cost</span>
            <span className={`font-semibold ${insufficientBalance ? "text-red-400" : "text-pink-400"}`}>{cost} SQ / month</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-pink-400/60 text-sm">Your balance</span>
            <span className={`font-semibold ${insufficientBalance ? "text-red-400" : "text-pink-400"}`}>{user.txCoins} SQ</span>
          </div>
          {insufficientBalance && (
            <p className="text-xs mt-3 text-red-400">
              You need {cost - user.txCoins} more SQ.{" "}
              <button onClick={() => navigateWithLoader("/topup")} className="underline font-semibold hover:text-red-300 transition-colors">Top up now →</button>
            </p>
          )}
        </div>

        {/* ===== STEP 1: SESSION ID ===== */}
        <div ref={getSessionRef} className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-pink-500/10 bg-pink-500/5">
            <StepBadge number={1} />
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Get Your Session ID</p>
              <p className="text-xs text-pink-400/60">Connect your WhatsApp account to the bot</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <a 
              href={template.sessionIdUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full p-4 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold text-sm hover:from-pink-400 hover:to-pink-500 transition-all duration-300 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4" />
                Get Session ID
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </a>
            {template.isDefault && (
              <div>
                <p className="text-xs font-semibold text-pink-400/60 mb-2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  A valid Session ID looks like:
                </p>
                <div className="bg-[#0a0a0f] rounded-xl p-3 font-mono text-xs text-pink-400/70 break-all leading-relaxed border border-pink-500/10 select-all">
                  Stanytz378/iamlegendv2_xxx
                </div>
                <p className="text-xs text-pink-400/50 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                  Copy the <span className="font-semibold text-white mx-0.5">entire</span> value — it is very long
                </p>
              </div>
            )}
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
          </div>
          <div className="p-4">
            <Label htmlFor="botname" className="text-pink-400/70">Name</Label>
            <Input
              id="botname"
              placeholder="e.g. mybot or johnbot"
              value={botName}
              onChange={e => setBotName(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              maxLength={20}
              className="mt-1 border-pink-500/20 focus:ring-pink-500/30 focus:border-pink-500/50 bg-[#0a0a0f]/50 text-white"
            />
            {botName && (
              <p className="text-xs text-pink-400/50 mt-1.5 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                App name: <span className="font-mono text-pink-400 ml-1">stanyhost-{sanitizeName(botName)}###</span>
              </p>
            )}
          </div>
        </div>

        {/* ===== STEP 3: SESSION INPUT / REQUIRED VARS ===== */}
        {template.isDefault ? (
          <div className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-pink-500/10 bg-pink-500/5">
              <StepBadge number={3} />
              <div className="flex-1">
                <p className="font-semibold text-sm text-white">Paste Your Session ID</p>
                <p className="text-xs text-pink-400/60">Copied from Step 1 above</p>
              </div>
              <ClipboardPaste className="w-4 h-4 text-pink-400/50 shrink-0" />
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
                  <p>A valid Session ID is very long (hundreds of characters).</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-pink-500/10 bg-pink-500/5">
              <StepBadge number={3} />
              <div className="flex-1">
                <p className="font-semibold text-sm text-white">Required Variables</p>
                <p className="text-xs text-pink-400/60">Fill in all required values for this bot</p>
              </div>
            </div>
            <div className="p-4">
              {loadingAppJson ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-pink-400" />
                </div>
              ) : requiredKeys.length === 0 ? (
                <p className="text-xs text-pink-400/60">No required variables found for this bot.</p>
              ) : (
                <div className="space-y-4">
                  {requiredKeys.map(k => (
                    <div key={k}>
                      <Label htmlFor={`req-${k}`} className="font-mono text-xs font-semibold text-pink-400">{k}</Label>
                      {appJsonEnv[k]?.description && (
                        <p className="text-xs text-pink-400/50 mt-0.5 mb-1">{appJsonEnv[k].description}</p>
                      )}
                      <textarea
                        id={`req-${k}`}
                        placeholder={SENSITIVE_KEYS.has(k.toUpperCase()) ? "Value hidden for security" : `Enter value for ${k}`}
                        value={requiredVarValues[k] || ""}
                        onChange={e => setRequiredVarValues(prev => ({ ...prev, [k]: e.target.value }))}
                        rows={2}
                        className="mt-0.5 w-full rounded-xl border border-pink-500/20 bg-[#0a0a0f]/50 px-3 py-2 text-sm font-mono text-white resize-y placeholder:text-pink-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/30 focus-visible:border-pink-500/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 4: DEVICE MODE (only for default) ===== */}
        {template.isDefault && (
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
                    <span><span className="font-semibold">Android mode</span> — Full interactive experience with buttons and menus.</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Apple className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
                    <span><span className="font-semibold">iOS mode</span> — Text-only. Commands still work but responses are plain text.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== OPTIONAL ENV VARS ===== */}
        {template.isDefault ? (
          <div className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
            <button
              onClick={() => setOptionalOpen(o => !o)}
              className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-pink-500/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-pink-400/70">
                <KeyRound className="w-4 h-4" />
                <span>Optional Environment Variables</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-pink-400/50 transition-transform ${optionalOpen ? "rotate-180" : ""}`} />
            </button>
            {optionalOpen && (
              <div className="px-4 pb-4">
                <p className="text-xs text-pink-400/50 mb-3">These are set automatically. You can override them after deployment from the Heroku dashboard.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {[
                    { key: "BOT_NAME", desc: "Display name of the bot (auto-set)" },
                    { key: "HEROKU_APP_NAME", desc: "Heroku app identifier (auto-set)" },
                    { key: "HEROKU_API_KEY", desc: "API key for Heroku (auto-set)" },
                  ].map(env => (
                    <div key={env.key} className="p-2.5 rounded-xl bg-pink-500/5 border border-pink-500/10">
                      <p className="font-mono text-xs font-semibold text-pink-400">{env.key}</p>
                      <p className="text-xs text-pink-400/50 mt-0.5">{env.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : optionalKeys.length > 0 ? (
          <div className="rounded-2xl border border-pink-500/10 bg-[#0a0a0f]/50 overflow-hidden">
            <button
              onClick={() => setOptionalOpen(o => !o)}
              className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-pink-500/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-pink-400/70">
                <KeyRound className="w-4 h-4" />
                <span>Optional Environment Variables</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-pink-400/50 transition-transform ${optionalOpen ? "rotate-180" : ""}`} />
            </button>
            {optionalOpen && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-pink-400/50">These are optional — leave blank to use defaults.</p>
                {optionalKeys.filter(k => !AUTO_VARS.has(k)).map(k => (
                  <div key={k}>
                    <Label htmlFor={`opt-${k}`} className="font-mono text-xs font-semibold text-pink-400">{k}</Label>
                    {appJsonEnv[k]?.description && (
                      <p className="text-xs text-pink-400/50 mt-0.5 mb-1">{appJsonEnv[k].description}</p>
                    )}
                    <Input
                      id={`opt-${k}`}
                      placeholder={SENSITIVE_KEYS.has(k.toUpperCase()) ? "Value hidden for security" : `Optional — ${k}`}
                      value={optionalVarValues[k] || ""}
                      onChange={e => setOptionalVarValues(prev => ({ ...prev, [k]: e.target.value }))}
                      className="mt-0.5 font-mono text-sm border-pink-500/20 focus:ring-pink-500/30 focus:border-pink-500/50 bg-[#0a0a0f]/50 text-white placeholder:text-pink-400/40"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ===== DEPLOY BUTTON ===== */}
        <Button
          className={`w-full h-12 text-base font-semibold rounded-xl ${insufficientBalance ? "opacity-70" : ""}`}
          onClick={handleDeploy}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Deploying...</>
          ) : insufficientBalance ? (
            <><Check className="w-5 h-5 mr-2" />Top Up — Insufficient Balance</>
          ) : (
            <><Rocket className="w-5 h-5 mr-2" />Deploy Bot — {cost} SQ / month</>
          )}
        </Button>

        {/* ===== FOOTER ===== */}
        <div className="pt-4 text-center">
          <p className="text-xs text-pink-400/30">
            Made with <Heart className="w-3 h-3 inline text-pink-400 animate-heartbeat" /> by STANY
          </p>
        </div>
      </main>

      {/* ===== LOW BALANCE MODAL ===== */}
      <Modal isOpen={lowBalanceModal} onClose={() => setLowBalanceModal(false)} title="Insufficient Balance" maxWidth="max-w-sm">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="text-sm text-pink-400/70">
              You need <span className="font-bold text-white">{cost} SQ</span> to deploy this bot, but you only have <span className="font-bold text-red-400">{user.txCoins} SQ</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-pink-500/20 text-pink-400 hover:bg-pink-500/10" onClick={() => setLowBalanceModal(false)}>Cancel</Button>
            <PinkButton className="flex-1" onClick={() => { setLowBalanceModal(false); navigateWithLoader("/topup"); }}>Top Up</PinkButton>
          </div>
        </div>
      </Modal>

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