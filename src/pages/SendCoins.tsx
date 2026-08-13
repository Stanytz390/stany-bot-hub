import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { transferCoins, createCoinLink, myCoinLinks, cancelCoinLink, coinLimits } from "@/lib/api";
import { Coins, Send, Link2, Copy, X, ArrowLeft, Gift, Loader2 } from "lucide-react";

interface GiftLink {
  _id: string;
  code: string;
  amountPerUser: number;
  maxClaims: number;
  claimed: number;
  active: boolean;
  expiresAt: string;
}

interface Limits {
  maxTransferPerTx: number;
  maxDailySent: number;
  maxPeoplePerLink: number;
  maxLinksPerDay: number;
}

export function SendCoins() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"direct" | "link">("direct");
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [perUser, setPerUser] = useState("10");
  const [people, setPeople] = useState("5");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<GiftLink[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);

  const loadLinks = () => { myCoinLinks().then((d) => Array.isArray(d) && setLinks(d)).catch(() => {}); };

  useEffect(() => {
    loadLinks();
    coinLimits().then(setLimits).catch(() => {});
  }, []);

  const handleTransfer = async () => {
    const amt = Number(amount);
    if (!username.trim() || !amt || amt < 1) { showToast("Enter a username and a valid amount", "error"); return; }
    setBusy(true);
    const res = await transferCoins(username.trim().replace("@", ""), Math.floor(amt));
    setBusy(false);
    if (res?.ok) {
      showToast(res.message, "success");
      setUsername(""); setAmount("");
      refreshUser?.();
    } else showToast(res?.error || "Transfer failed", "error");
  };

  const handleCreateLink = async () => {
    const p = Number(perUser); const n = Number(people);
    if (!p || !n) { showToast("Fill amount and number of people", "error"); return; }
    setBusy(true);
    const res = await createCoinLink(Math.floor(p), Math.floor(n), message.trim() || undefined);
    setBusy(false);
    if (res?.ok) {
      showToast(`Gift link created — ${res.total} SQ locked for ${res.people} people`, "success");
      setMessage("");
      loadLinks();
      refreshUser?.();
    } else showToast(res?.error || "Could not create link", "error");
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/claim/${code}`);
    showToast("Gift link copied", "success");
  };

  const cancel = async (code: string) => {
    const res = await cancelCoinLink(code);
    if (res?.ok) {
      showToast(res.refunded > 0 ? `Link closed, ${res.refunded} SQ refunded` : "Link closed", "success");
      loadLinks(); refreshUser?.();
    } else showToast(res?.error || "Failed", "error");
  };

  return (
    <div className="relative min-h-screen bg-background">
      <TechBackground />
      <div className="relative z-[1] mx-auto max-w-3xl px-4 py-8">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="mb-6 rounded-2xl border border-primary/20 bg-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your balance</p>
          <p className="font-display text-4xl font-bold text-primary">{user?.txCoins ?? 0} SQ</p>
        </div>

        <div className="mb-5 inline-flex rounded-full border border-border p-1">
          <button
            onClick={() => setTab("direct")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${tab === "direct" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <Send className="mr-1.5 inline h-4 w-4" /> Send to user
          </button>
          <button
            onClick={() => setTab("link")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${tab === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <Gift className="mr-1.5 inline h-4 w-4" /> Gift link
          </button>
        </div>

        {tab === "direct" ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Send SQ coins</CardTitle>
              <CardDescription>
                Send coins straight to another username.
                {limits ? ` Max ${limits.maxTransferPerTx} SQ per transfer, ${limits.maxDailySent} SQ per day.` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. stanytz" />
              </div>
              <div className="space-y-2">
                <Label>Amount (SQ)</Label>
                <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
              </div>
              <Button className="w-full" disabled={busy} onClick={handleTransfer}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coins className="mr-2 h-4 w-4" />}
                Send coins
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Create a gift link</CardTitle>
              <CardDescription>
                Coins are locked upfront and shared with the first people who open your link.
                {limits ? ` Up to ${limits.maxPeoplePerLink} people, ${limits.maxLinksPerDay} links per day.` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>SQ per person</Label>
                  <Input type="number" min={1} value={perUser} onChange={(e) => setPerUser(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Number of people</Label>
                  <Input type="number" min={1} value={people} onChange={(e) => setPeople(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enjoy the coins!" />
              </div>
              <p className="text-sm text-muted-foreground">
                Total locked: <span className="font-semibold text-primary">{(Number(perUser) || 0) * (Number(people) || 0)} SQ</span>
              </p>
              <Button className="w-full" disabled={busy} onClick={handleCreateLink}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Create gift link
              </Button>
            </CardContent>
          </Card>
        )}

        {links.length > 0 && (
          <div className="mt-8 space-y-3">
            <h2 className="font-display text-lg font-semibold">My gift links</h2>
            {links.map((l) => (
              <div key={l._id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">/claim/{l.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.amountPerUser} SQ each · {l.claimed}/{l.maxClaims} claimed · {l.active ? "active" : "closed"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(l.code)}><Copy className="h-4 w-4" /></Button>
                  {l.active && (
                    <Button size="sm" variant="outline" onClick={() => cancel(l.code)}><X className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
