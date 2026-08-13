import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminBlockedDevices, adminUnblockDevice, adminUnblockTrial, type BlockedDevice, type BlockedTrialRow } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Loader2, ShieldOff, Search, Trash2 } from "lucide-react";

export function AdminBlockedDevices() {
  const [devices, setDevices] = useState<BlockedDevice[]>([]);
  const [trials, setTrials] = useState<BlockedTrialRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const res = await adminBlockedDevices(query);
      setDevices(res?.devices || []);
      setTrials(res?.trials || []);
    } catch {
      showToast("Failed to load blocked devices", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const unblockDevice = async (id: string) => {
    setBusy(id);
    try {
      await adminUnblockDevice(id);
      setDevices(d => d.filter(x => x.id !== id));
      showToast("Device unblocked", "success");
    } catch {
      showToast("Failed to unblock", "error");
    } finally { setBusy(null); }
  };

  const unblockTrial = async (id: string) => {
    setBusy(id);
    try {
      await adminUnblockTrial(id);
      setTrials(t => t.filter(x => x.id !== id));
      showToast("Trial block removed", "success");
    } catch {
      showToast("Failed to remove", "error");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void load(q); }}
            placeholder="Search IP, fingerprint, phone or email"
          />
        </div>
        <Button onClick={() => void load(q)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-primary" />
            Blocked devices ({devices.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {devices.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No device records found.</p>
          )}
          {devices.map(d => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.username || d.email || "Unknown user"}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  IP {d.ip} · FP {d.fingerprint || "—"}
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => void unblockDevice(d.id)}>
                {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unblock"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-primary" />
            Blocked trials ({trials.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {trials.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No trial blocks found.</p>
          )}
          {trials.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.phoneNumber}</p>
                <p className="text-xs text-muted-foreground truncate">{t.email}</p>
              </div>
              <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => void unblockTrial(t.id)}>
                {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
