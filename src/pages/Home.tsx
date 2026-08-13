import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { TechBackground } from "@/components/TechBackground";
import { AppLogoIcon } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import {
  ArrowRight,
  Bot,
  Coins,
  ShieldCheck,
  Server,
  MessagesSquare,
  Smartphone,
  Sparkle,
  CheckCircle2,
  Zap
} from "lucide-react";

const WORD_KEYS = ["home.w1", "home.w2", "home.w3", "home.w4", "home.w5"];

const FEATURES = [
  { icon: Bot, k: "home.f1" },
  { icon: Server, k: "home.f2" },
  { icon: Coins, k: "home.f3" },
  { icon: MessagesSquare, k: "home.f4" },
  { icon: ShieldCheck, k: "home.f5" },
  { icon: Smartphone, k: "home.f6" }
];

const STEPS = [
  { n: "01", k: "home.s1" },
  { n: "02", k: "home.s2" },
  { n: "03", k: "home.s3" }
];

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % WORD_KEYS.length), 2200);
    return () => clearInterval(t);
  }, []);

  const start = () => navigate(user ? "/dashboard" : "/signup");

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <TechBackground />

      <div className="relative z-[1]">
        {/* NAV */}
        <header className="sticky top-0 z-20 bg-background border-b border-primary/10">
          <nav className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-3">
            <AppLogoIcon className="w-9 h-9" />
            <span className="font-display font-extrabold tracking-tight text-foreground">STANY HOSTING</span>
            <div className="flex-1" />
            <LanguageSwitcher />
            {!loading && !user && (
              <button
                onClick={() => navigate("/login")}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition px-3 py-2"
              >
                {t("home.login")}
              </button>
            )}
            <Button onClick={start} className="rounded-xl h-9 px-4 text-sm font-semibold">
              {user ? t("home.dashboard") : t("home.cta")}
            </Button>
          </nav>
        </header>

        {/* HERO */}
        <section className="max-w-6xl mx-auto px-4 pt-14 pb-16 text-center">
          <span className="chip-premium mx-auto">
            <Sparkle className="w-3.5 h-3.5" /> {t("home.badge")}
          </span>

          <h1 className="mt-6 font-display text-4xl sm:text-6xl font-extrabold leading-[1.05] text-foreground">
            {t("home.h1a")}
            <br />
            <span className="text-gradient-premium">{t("home.h1b")}</span>
          </h1>

          {/* Sliding words */}
          <div className="mt-5 h-8 overflow-hidden">
            <div
              className="transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ transform: `translateY(-${wordIndex * 2}rem)` }}
            >
              {WORD_KEYS.map((w) => (
                <div key={w} className="h-8 flex items-center justify-center text-lg font-semibold text-primary">
                  {t(w)}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 max-w-xl mx-auto text-muted-foreground leading-relaxed">
{t("home.sub")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={start} className="rounded-2xl h-12 px-7 text-base font-bold glow-pink">
              {t("home.cta")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/docs")}
              className="rounded-2xl h-12 px-7 text-base font-semibold border-primary/25"
            >
              {t("home.how")}
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {["home.t1", "home.t2", "home.t3"].map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {t(key)}
              </span>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="font-display text-2xl font-bold text-foreground text-center">{t("home.features")}</h2>
          <p className="text-center text-sm text-muted-foreground mt-2">{t("home.featuresSub")}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, k }) => (
              <div key={k} className="card-premium p-5 hover:-translate-y-1 transition-transform">
                <div className="w-11 h-11 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="mt-4 font-display font-bold text-foreground">{t(k)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t(k + "d")}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW TO */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="surface-glass p-6 sm:p-9">
            <h2 className="font-display text-2xl font-bold text-foreground text-center">{t("home.steps")}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="relative">
                  <span className="font-display text-4xl font-extrabold text-primary/25">{s.n}</span>
                  <h3 className="mt-1 font-display font-bold text-foreground">{t(s.k)}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t(s.k + "d")}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="card-premium p-8 text-center">
            <Zap className="w-8 h-8 text-primary mx-auto" />
            <h2 className="mt-3 font-display text-2xl font-bold text-foreground">{t("home.ready")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("home.readySub")}</p>
            <Button onClick={start} className="mt-6 rounded-2xl h-12 px-8 text-base font-bold">
              {t("home.cta")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </section>

        <footer className="border-t border-primary/10 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} STANY HOSTING — {t("home.footer")}
        </footer>
      </div>
    </div>
  );
}
