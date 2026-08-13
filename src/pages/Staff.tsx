import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { staffMe, staffUsers, staffGrantSq, staffCoupons, staffCreateCoupons, staffDeleteCoupons, staffSetRole, getAuditLogs, getCommunityReports, updateCommunityReport, hideCommunityMessage, batchModerate } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Loader2, ArrowLeft, Coins, Ticket, ShieldCheck, Search, Trash2, Plus, History, Flag, EyeOff, Check, X } from "lucide-react";

interface StaffUser {
  _id: string;
  email: string;
  username: string;
  txCoins: number;
  role: "user" | "subadmin" | "admin";
  isBanned: boolean;
}

interface AuditEntry {
  _id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  targetLabel: string;
  before: string;
  after: string;
  meta: string;
  createdAt: string;
}

interface ReportEntry {
  _id: string;
  messageId: string;
  messageText: string;
  messageAuthor: string;
  reporterName: string;
  reason: string;
  status: string;
  priority?: "high" | "medium" | "low";
  reportCount?: number;
  createdAt: string;
}

interface StaffCoupon {
  _id: string;
  code: string;
  txAmount: number;
  claimedBy: string | null;
}

export function Staff() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useI18n();
  const [role, setRole] = useState<"user" | "subadmin" | "admin" | null>(null);
  const [tab, setTab] = useState<"sq" | "coupons" | "roles" | "reports" | "audit">("sq");
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [coupons, setCoupons] = useState<StaffCoupon[]>([]);
  const [q, setQ] = useState("");
  const [grantUser, setGrantUser] = useState("");
  const [grantAmount, setGrantAmount] = useState("10");
  const [couponAmount, setCouponAmount] = useState("10");
  const [couponQty, setCouponQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  // Audit log filters + pagination
  const [auditAction, setAuditAction] = useState("all");
  const [auditQuery, setAuditQuery] = useState("");
  const [auditActor, setAuditActor] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActions, setAuditActions] = useState<string[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  // Moderation queue batch selection
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const loadUsers = useCallback(async (query = "") => {
    const res = await staffUsers(query);
    setUsers(res?.users || []);
  }, []);

  const loadCoupons = useCallback(async () => {
    const res = await staffCoupons();
    setCoupons((res?.coupons || []).map((c: StaffCoupon) => ({ ...c, _id: String(c._id) })));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      const res = await staffMe();
      if (res?.role !== "admin" && res?.role !== "subadmin") { navigate("/dashboard"); return; }
      setRole(res.role);
      await Promise.all([loadUsers(), loadCoupons()]);
      setLoading(false);
    })();
  }, [authLoading, user, navigate, loadUsers, loadCoupons]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    const res = await getAuditLogs({
      action: auditAction,
      q: auditQuery.trim(),
      actor: auditActor.trim(),
      from: auditFrom,
      to: auditTo,
      page: auditPage,
      limit: 20
    });
    setLogs(res?.logs || []);
    setAuditPages(res?.pages || 1);
    setAuditTotal(res?.total || 0);
    setAuditActions(res?.actions || []);
    setAuditLoading(false);
  }, [auditAction, auditQuery, auditActor, auditFrom, auditTo, auditPage]);


  const loadReports = useCallback(async () => {
    const res = await getCommunityReports("open");
    setReports(res?.reports || []);
  }, []);

  useEffect(() => {
    if (tab === "audit") loadAudit();
    if (tab === "reports") loadReports();
  }, [tab, loadAudit, loadReports]);

  const runBatch = async (action: "hide" | "delete" | "reviewed" | "dismiss") => {
    if (!selectedReports.length) return;
    const res = await batchModerate({ reportIds: selectedReports, action });
    if (res?.success) {
      showToast(`${action} applied to ${selectedReports.length} report(s)`, "success");
      setSelectedReports([]);
      loadReports();
    } else showToast(res?.error || "Batch action failed", "error");
  };

  const resolveReport = async (r: ReportEntry, action: "hide" | "dismiss") => {
    if (action === "hide") await hideCommunityMessage(r.messageId, true, `Report: ${r.reason}`);
    const res = await updateCommunityReport(r._id, action === "hide" ? "resolved" : "dismissed");
    if (res?.success) {
      setReports((prev) => prev.filter((x) => x._id !== r._id));
      showToast(action === "hide" ? "Message hidden" : "Report dismissed", "success");
    } else showToast(res?.error || "Action failed", "error");
  };

  const doGrant = async () => {
    if (!grantUser.trim() || !Number(grantAmount)) { showToast("Enter username and amount", "error"); return; }
    setBusy(true);
    const res = await staffGrantSq(grantUser.trim(), Number(grantAmount));
    setBusy(false);
    if (res?.success) { showToast(res.message, "success"); setGrantUser(""); loadUsers(q); }
    else showToast(res?.error || "Failed", "error");
  };

  const doCreateCoupons = async () => {
    setBusy(true);
    const res = await staffCreateCoupons(Number(couponAmount), Number(couponQty));
    setBusy(false);
    if (res?.success) { showToast(`Created: ${res.codes.join(", ")}`, "success"); loadCoupons(); }
    else showToast(res?.error || "Failed", "error");
  };

  const doDeleteCoupons = async () => {
    if (!selected.length) return;
    const res = await staffDeleteCoupons(selected);
    if (res?.success) { showToast("Deleted", "success"); setSelected([]); loadCoupons(); }
  };

  const changeRole = async (id: string, newRole: "user" | "subadmin" | "admin") => {
    const res = await staffSetRole(id, newRole);
    if (res?.success) { showToast("Role updated", "success"); loadUsers(q); }
    else showToast(res?.error || "Failed", "error");
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const tabs = [
    { key: "sq" as const, label: "Grant SQ", icon: Coins },
    { key: "coupons" as const, label: "Redeem codes", icon: Ticket },
    { key: "reports" as const, label: "Reports", icon: Flag },
    ...(role === "admin" ? [{ key: "roles" as const, label: "Roles", icon: ShieldCheck }] : []),
    { key: "audit" as const, label: "Audit log", icon: History }
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />
      <div className="relative z-[1] max-w-4xl mx-auto p-4 pb-16">
        <header className="flex items-center gap-3 py-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Staff panel</h1>
            <p className="text-xs text-muted-foreground">
              {role === "admin" ? "Owner access — full control" : "Sub-admin — SQ & redeem codes only"}
            </p>
          </div>
        </header>

        <div className="flex gap-2 my-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition whitespace-nowrap ${
                tab === t.key ? "bg-primary text-primary-foreground border-primary" : "border-primary/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "sq" && (
          <div className="space-y-4">
            <Card className="card-premium">
              <CardContent className="pt-6 space-y-3">
                <h2 className="font-display font-semibold text-foreground">Send SQ to a user</h2>
                <Input placeholder="username or email" value={grantUser} onChange={(e) => setGrantUser(e.target.value)} />
                <Input type="number" placeholder="SQ amount" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} />
                <Button className="w-full" onClick={doGrant} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />} Grant SQ
                </Button>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardContent className="pt-6">
                <div className="flex gap-2 mb-4">
                  <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
                  <Button variant="outline" onClick={() => loadUsers(q)}><Search className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {users.map((u) => (
                    <div key={u._id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary border border-primary/12">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.username || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{role === "admin" ? u.email : `${u.role}`}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-primary">{u.txCoins} SQ</span>
                        <Button size="sm" variant="outline" onClick={() => { setGrantUser(u.username || u.email); setTab("sq"); }}>Give</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "coupons" && (
          <Card className="card-premium">
            <CardContent className="pt-6 space-y-4">
              <h2 className="font-display font-semibold text-foreground">Create redeem codes</h2>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="SQ per code" value={couponAmount} onChange={(e) => setCouponAmount(e.target.value)} />
                <Input type="number" placeholder="Quantity" value={couponQty} onChange={(e) => setCouponQty(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={doCreateCoupons} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Generate
                </Button>
                <Button variant="outline" onClick={doDeleteCoupons} disabled={!selected.length}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete ({selected.length})
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selected.length === coupons.length && coupons.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? coupons.map((c) => c._id) : [])}
                />
                Mark all
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {coupons.map((c) => (
                  <label key={c._id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-primary/12 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(c._id)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c._id] : s.filter((x) => x !== c._id)))}
                    />
                    <span className="font-mono text-sm text-foreground flex-1">{c.code}</span>
                    <span className="text-sm text-primary font-bold">{c.txAmount} SQ</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${c.claimedBy ? "border-muted text-muted-foreground" : "border-green-500/40 text-green-400"}`}>
                      {c.claimedBy ? "Claimed" : "Active"}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "roles" && role === "admin" && (
          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex gap-2 mb-4">
                <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
                <Button variant="outline" onClick={() => loadUsers(q)}><Search className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {users.map((u) => (
                  <div key={u._id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary border border-primary/12">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.username || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u._id, e.target.value as "user" | "subadmin" | "admin")}
                      className="text-xs rounded-lg bg-background border border-primary/25 px-2 py-1.5 text-foreground"
                    >
                      <option value="user">User</option>
                      <option value="subadmin">Sub-admin</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {tab === "reports" && (
          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="chip-premium">High {reports.filter((r) => r.priority === "high").length}</span>
                <span className="chip-premium">Medium {reports.filter((r) => r.priority === "medium").length}</span>
                <span className="chip-premium">Low {reports.filter((r) => r.priority === "low").length}</span>
                <div className="flex-1" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={selectedReports.length === reports.length && reports.length > 0}
                    onChange={(e) => setSelectedReports(e.target.checked ? reports.map((r) => r._id) : [])}
                  />
                  Mark all
                </label>
              </div>

              {selectedReports.length > 0 && (
                <div className="glass-panel flex flex-wrap items-center gap-2 rounded-xl p-3 mb-4">
                  <span className="text-xs text-foreground font-medium">{selectedReports.length} selected</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => runBatch("hide")}>
                    <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => runBatch("delete")}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => runBatch("reviewed")}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Mark reviewed
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => runBatch("dismiss")}>
                    <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                  </Button>
                </div>
              )}

              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No open reports 🎉</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => {
                    const tone =
                      r.priority === "high"
                        ? "border-destructive/40 bg-destructive/5"
                        : r.priority === "medium"
                        ? "border-amber-500/35 bg-amber-500/5"
                        : "border-primary/12 bg-secondary";
                    return (
                      <div key={r._id} className={`p-3 rounded-xl border ${tone}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedReports.includes(r._id)}
                            onChange={(e) =>
                              setSelectedReports((s) => (e.target.checked ? [...s, r._id] : s.filter((x) => x !== r._id)))
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-xs text-muted-foreground">
                                <span className="text-foreground font-semibold">{r.messageAuthor}</span> reported by {r.reporterName}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  r.priority === "high" ? "border-destructive/40 text-destructive"
                                  : r.priority === "medium" ? "border-amber-500/40 text-amber-400"
                                  : "border-primary/30 text-primary"
                                }`}>
                                  {(r.priority || "low").toUpperCase()} · {r.reportCount || 1} reports
                                </span>
                                <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-foreground break-words">{r.messageText}</p>
                            <p className="mt-1 text-xs text-amber-400">Reason: {r.reason}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => resolveReport(r, "hide")}>
                                <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide message
                              </Button>
                              <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => resolveReport(r, "dismiss")}>
                                <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "audit" && (
          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 mb-4">
                <Input
                  placeholder={t("audit.search")}
                  value={auditQuery}
                  onChange={(e) => { setAuditQuery(e.target.value); setAuditPage(1); }}
                  className="lg:col-span-2"
                />
                <Input placeholder="Actor email" value={auditActor} onChange={(e) => { setAuditActor(e.target.value); setAuditPage(1); }} />
                <select
                  value={auditAction}
                  onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
                  className="text-sm rounded-xl bg-background border border-primary/25 px-3 py-2 text-foreground"
                >
                  <option value="all">{t("audit.all")}</option>
                  {auditActions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <div className="flex gap-2">
                  <Input type="date" value={auditFrom} onChange={(e) => { setAuditFrom(e.target.value); setAuditPage(1); }} />
                  <Input type="date" value={auditTo} onChange={(e) => { setAuditTo(e.target.value); setAuditPage(1); }} />
                </div>
              </div>

              {auditLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">{t("audit.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div key={l._id} className="p-3 rounded-xl bg-secondary border border-primary/12">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-primary">{l.action}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground break-words">
                        <span className="text-foreground">{l.actorEmail}</span> ({l.actorRole}) → {l.targetLabel || "—"}
                        {l.before || l.after ? (
                          <> : <span className="line-through">{l.before || "?"}</span> <Check className="inline w-3 h-3" /> <span className="text-foreground">{l.after}</span></>
                        ) : null}
                      </p>
                      {l.meta && <p className="mt-1 text-[11px] text-muted-foreground/80 break-words">{l.meta}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 mt-4">
                <span className="text-xs text-muted-foreground">
                  {t("audit.page", { p: auditPage, t: auditPages })} · {auditTotal} entries
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => Math.max(1, p - 1))}>
                    {t("audit.prev")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={auditPage >= auditPages} onClick={() => setAuditPage((p) => p + 1)}>
                    {t("audit.next")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
