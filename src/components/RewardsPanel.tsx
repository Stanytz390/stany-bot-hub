import { useCallback, useEffect, useState } from "react";
import { Gift, Trophy, Loader2, Check } from "lucide-react";
import { getRewards, claimDailyReward, claimAchievement, type DailyRewardState, type AchievementState } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props { onBalanceChange?: (balance: number) => void }

/** Daily reward button + achievement plan progress. */
export function RewardsPanel({ onBalanceChange }: Props) {
  const { showToast } = useToast();
  const [daily, setDaily] = useState<DailyRewardState | null>(null);
  const [achievements, setAchievements] = useState<AchievementState[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>("");
  const [countdown, setCountdown] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await getRewards();
      setDaily(data.daily);
      setAchievements(data.achievements || []);
      setCountdown(data.daily?.secondsLeft || 0);
    } catch { /* rewards are optional UI */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const doDaily = async () => {
    setBusy("daily");
    try {
      const r = await claimDailyReward();
      showToast(`🎁 You received ${r.amount} SQ!`, "success");
      onBalanceChange?.(r.newBalance);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not claim reward", "error");
    }
    setBusy("");
  };

  const doAchievement = async (key: string) => {
    setBusy(key);
    try {
      const r = await claimAchievement(key);
      showToast(`🏆 Achievement reward: +${r.amount} SQ`, "success");
      onBalanceChange?.(r.newBalance);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not claim achievement", "error");
    }
    setBusy("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!daily) return null;

  const disabledReason =
    daily.reason === "min_balance" ? `Requires ${daily.minBalance}+ SQ balance`
    : daily.reason === "cooldown" ? `Next in ${formatCountdown(countdown)}`
    : daily.reason === "disabled" ? "Currently unavailable"
    : "";

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">Daily reward</h3>
            <p className="text-xs text-muted-foreground">
              {daily.amount} SQ every {daily.cooldownHours}h · members with {daily.minBalance}+ SQ
            </p>
          </div>
          <button
            onClick={doDaily}
            disabled={!daily.eligible || busy === "daily"}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition enabled:hover:opacity-90 disabled:opacity-45"
          >
            {busy === "daily" ? <Loader2 className="h-4 w-4 animate-spin" /> : daily.eligible ? `Claim ${daily.amount} SQ` : "Claimed"}
          </button>
        </div>
        {!daily.eligible && disabledReason && (
          <p className="mt-3 text-xs text-muted-foreground">{disabledReason}</p>
        )}
      </div>

      {achievements.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Achievement plan</h3>
          </div>
          <div className="space-y-3">
            {achievements.map((a) => {
              const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
              return (
                <div key={a.key} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.description || `${a.progress}/${a.target}`}</p>
                    </div>
                    {a.claimed ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        <Check className="h-3 w-3" /> Claimed
                      </span>
                    ) : (
                      <button
                        onClick={() => doAchievement(a.key)}
                        disabled={!a.completed || busy === a.key}
                        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition enabled:hover:opacity-90 disabled:opacity-45"
                      >
                        {busy === a.key ? "…" : `+${a.rewardTx} SQ`}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
