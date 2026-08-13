import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { previewCoinLink, claimCoinLink } from "@/lib/api";
import { ArrowLeft, Gift, Loader2, PartyPopper } from "lucide-react";

interface Preview {
  from: string;
  amountPerUser: number;
  maxClaims: number;
  claimed: number;
  remaining: number;
  message?: string;
  active: boolean;
  error?: string;
}

export function ClaimCoins() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState<string | null>(null);

  useEffect(() => {
    previewCoinLink(code)
      .then(setPreview)
      .catch(() => setPreview({ error: "Could not load this gift" } as Preview))
      .finally(() => setLoading(false));
  }, [code]);

  const handleClaim = async () => {
    if (!user) { navigate(`/login?next=/claim/${code}`); return; }
    setBusy(true);
    const res = await claimCoinLink(code);
    setBusy(false);
    if (res?.ok) {
      setClaimed(res.message);
      refreshUser?.();
    } else showToast(res?.error || "Could not claim this gift", "error");
  };

  return (
    <div className="relative min-h-screen bg-background">
      <TechBackground />
      <div className="relative z-[1] flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
        <button onClick={() => navigate("/dashboard")} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Card className="w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {claimed ? <PartyPopper className="h-8 w-8 text-primary" /> : <Gift className="h-8 w-8 text-primary" />}
            </div>
            <CardTitle className="font-display text-2xl">
              {claimed ? "Congratulations!" : "SQ Coin Gift"}
            </CardTitle>
            <CardDescription>
              {loading
                ? "Loading gift…"
                : claimed
                  ? claimed
                  : preview?.error
                    ? preview.error
                    : preview
                      ? `@${preview.from} is sharing ${preview.amountPerUser} SQ with ${preview.maxClaims} people`
                      : "Gift not found"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            ) : claimed ? (
              <Button className="w-full" onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
            ) : preview && !preview.error ? (
              <>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="font-display text-4xl font-bold text-primary">{preview.amountPerUser} SQ</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {preview.remaining} of {preview.maxClaims} gifts left
                  </p>
                  {preview.message ? <p className="mt-2 text-sm">{preview.message}</p> : null}
                </div>
                <Button className="w-full" disabled={busy || !preview.active || preview.remaining < 1} onClick={handleClaim}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {!preview.active || preview.remaining < 1 ? "All gifts claimed" : user ? "Claim my SQ" : "Login to claim"}
                </Button>
              </>
            ) : (
              <Link to="/dashboard" className="text-sm text-primary underline">Go to dashboard</Link>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
