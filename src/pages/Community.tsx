import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TechBackground } from "@/components/TechBackground";
import {
  getCommunityMessages,
  postCommunityMessage,
  deleteCommunityMessage,
  reportCommunityMessage,
  hideCommunityMessage,
  getCommunityReports,
  batchModerate,
  subscribeCommunity
} from "@/lib/api";
import {
  Loader2, Send, Reply, Trash2, ArrowLeft, Users, X, Flag, EyeOff, Eye,
  Check, CheckCheck, AlertCircle, ArrowDown, ShieldAlert
} from "lucide-react";

type Delivery = "sending" | "sent" | "failed";
type BatchAction = "hide" | "delete" | "reviewed" | "dismiss";


interface ChatMessage {
  _id: string;
  userId: string;
  username: string;
  role: string;
  text: string;
  replyTo: string | null;
  replyToUsername: string;
  replyToText: string;
  hidden?: boolean;
  hiddenReason?: string;
  reportCount?: number;
  createdAt: string;
  delivery?: Delivery;
  clientId?: string;
}

interface ReportItem {
  _id: string;
  messageId: string;
  messageText: string;
  messageAuthor: string;
  reporterName: string;
  reason: string;
  priority?: "high" | "medium" | "low";
  reportCount?: number;
  createdAt: string;
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// De-duplicate by server id (and by optimistic clientId) then keep chronological order.
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  const clientIds = new Map<string, string>();
  for (const m of [...prev, ...incoming]) {
    const key = m._id;
    const existing = byId.get(key);
    byId.set(key, existing ? { ...existing, ...m } : m);
    if (m.clientId) {
      const prior = clientIds.get(m.clientId);
      if (prior && prior !== key) byId.delete(prior);
      clientIds.set(m.clientId, key);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function roleBadge(role: string) {
  if (role === "admin") return { label: "ADMIN", cls: "bg-primary/20 text-primary border-primary/40" };
  if (role === "subadmin") return { label: "STAFF", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return null;
}


export function Community() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [myRole, setMyRole] = useState<string>("user");
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [pendingBatch, setPendingBatch] = useState<BatchAction | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const lastAt = useRef<string | null>(null);
  const isStaff = myRole === "admin" || myRole === "subadmin";
  const myId = (user as unknown as { id?: string })?.id || "";

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const scrollDown = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : ("instant" as ScrollBehavior) });
    setUnseen(0);
  }, []);

  // Track whether the reader is pinned to the bottom (drives auto-scroll + unseen counter).
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setUnseen(0);
  }, []);

  const pushIncoming = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      // Skip if we already have this server id, or if it is the echo of our own optimistic bubble.
      if (prev.some((m) => m._id === msg._id)) return prev;
      if (msg.clientId && prev.some((m) => m.clientId && m.clientId === msg.clientId)) {
        return prev.map((m) =>
          m.clientId === msg.clientId ? { ...m, ...msg, delivery: "sent" as Delivery } : m
        );
      }
      if (!lastAt.current || new Date(msg.createdAt) > new Date(lastAt.current)) lastAt.current = msg.createdAt;
      if (!atBottomRef.current) setUnseen((n) => n + 1);
      return mergeMessages(prev, [{ ...msg, delivery: "sent" }]);
    });
  }, []);


  const loadReports = useCallback(async () => {
    setQueueLoading(true);
    const res = await getCommunityReports("open");
    setReports(res?.reports || []);
    setQueueLoading(false);
  }, []);

  useEffect(() => { if (queueOpen) loadReports(); }, [queueOpen, loadReports]);

  const load = useCallback(async (incremental: boolean) => {
    try {
      const res = await getCommunityMessages(incremental && lastAt.current ? lastAt.current : undefined);
      if (res?.role) setMyRole(res.role);
      const list: ChatMessage[] = res?.messages || [];
      if (!list.length) return;
      lastAt.current = list[list.length - 1].createdAt;
      setMessages((prev) => {
        const list2 = list.map((m) => ({ ...m, delivery: "sent" as Delivery }));
        if (!incremental) return mergeMessages([], list2);
        const ids = new Set(prev.map((m) => m._id));
        const freshCount = list2.filter((m) => !ids.has(m._id)).length;
        if (freshCount && !atBottomRef.current) setUnseen((n) => n + freshCount);
        return mergeMessages(prev, list2);
      });

    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => { await load(false); setLoading(false); setTimeout(() => scrollDown(false), 60); })();

    const stop = subscribeCommunity(
      (event, data) => {
        if (event === "message") {
          pushIncoming(data as unknown as ChatMessage);
        } else if (event === "deleted") {
          setMessages((prev) => prev.filter((m) => m._id !== String(data._id)));
        } else if (event === "hidden") {
          setMessages((prev) =>
            prev
              .map((m) => (m._id === String(data._id) ? { ...m, hidden: Boolean(data.hidden) } : m))
              .filter((m) => !m.hidden || isStaff || m.userId === myId)
          );
        } else if (event === "report" && isStaff) {
          setUnseen((n) => n);
          loadReports();
        }
      },
      (connected) => setLive(connected),
      // Stream came back after a drop — resync the gap.
      () => { load(true); if (isStaff) loadReports(); }
    );


    const poll = setInterval(() => load(true), 15000);
    return () => { stop(); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, load, scrollDown, isStaff, myId, pushIncoming]);

  // Auto-scroll only when the reader is already at the bottom.
  useEffect(() => {
    if (atBottomRef.current) scrollDown();
  }, [messages.length, scrollDown]);

  const doSend = async (value: string, replyToMsg: ChatMessage | null, clientId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.clientId === clientId ? { ...m, delivery: "sending" as Delivery } : m))
    );
    try {
      const res = await postCommunityMessage(value, replyToMsg?._id || null, clientId);
      if (res?.message) {
        setMessages((prev) => {
          // Drop any copy the SSE stream already delivered, then settle the optimistic bubble.
          const withoutEcho = prev.filter((m) => m._id !== res.message._id || m.clientId === clientId);
          return withoutEcho.map((m) =>
            m.clientId === clientId ? { ...res.message, clientId, delivery: "sent" as Delivery } : m
          );
        });
        lastAt.current = res.message.createdAt;
      } else {
        setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, delivery: "failed" as Delivery } : m)));
        showToast(res?.error || "Failed to send", "error");
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, delivery: "failed" as Delivery } : m)));
      showToast("Failed to send", "error");
    }
  };

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ChatMessage = {
      _id: clientId,
      clientId,
      userId: myId,
      username: "You",
      role: myRole,
      text: value,
      replyTo: replyTo?._id || null,
      replyToUsername: replyTo?.username || "",
      replyToText: replyTo?.text || "",
      createdAt: new Date().toISOString(),
      delivery: "sending"
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    const currentReply = replyTo;
    setReplyTo(null);
    atBottomRef.current = true;
    setSending(true);
    await doSend(value, currentReply, clientId);
    setSending(false);
  };

  const retry = (m: ChatMessage) => {
    if (!m.clientId) return;
    doSend(m.text, null, m.clientId);
  };

  const report = async (id: string) => {
    const reason = window.prompt("Why are you reporting this message?")?.trim();
    if (reason === undefined) return;
    const res = await reportCommunityMessage(id, reason || "Not specified");
    if (res?.success) showToast("Report sent to moderators", "success");
    else showToast(res?.error || "Failed to report", "error");
  };

  const toggleHide = async (m: ChatMessage) => {
    const next = !m.hidden;
    const reason = next ? window.prompt("Reason for hiding (optional)") || "" : "";
    const res = await hideCommunityMessage(m._id, next, reason);
    if (res?.success) {
      setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, hidden: next } : x)));
      showToast(next ? "Message hidden" : "Message restored", "success");
    } else showToast(res?.error || "Action failed", "error");
  };

  const remove = async (id: string) => {
    const res = await deleteCommunityMessage(id);
    if (res?.success) setMessages((prev) => prev.filter((m) => m._id !== id));
    else showToast(res?.error || "Failed to delete", "error");
  };

  const runBatch = async (action: BatchAction) => {
    if (!selectedReports.length) return;
    setBatchRunning(true);
    const res = await batchModerate({ reportIds: selectedReports, action });
    setBatchRunning(false);
    setPendingBatch(null);
    if (res?.success) {
      showToast(`${action} · ${res.affected ?? selectedReports.length}`, "success");
      setSelectedReports([]);
      loadReports();
      load(false);
    } else showToast(res?.error || "Batch action failed", "error");
  };

  if (authLoading || !user) return null;

  const openHigh = reports.filter((r) => r.priority === "high").length;

  // Live summary for the confirmation modal.
  const selected = reports.filter((r) => selectedReports.includes(r._id));
  const uniqueMessages = new Set(selected.map((r) => r.messageId));
  const highCount = selected.filter((r) => r.priority === "high").length;
  const authorCount = new Set(selected.map((r) => r.messageAuthor)).size;
  const batchLabel: Record<BatchAction, string> = {
    hide: "Hide messages",
    delete: "Delete messages",
    reviewed: "Mark as reviewed",
    dismiss: "Dismiss reports"
  };


  const deliveryIcon = (d?: Delivery) => {
    if (d === "sending") return <Loader2 className="w-3 h-3 animate-spin opacity-70" />;
    if (d === "failed") return <AlertCircle className="w-3 h-3 text-destructive" />;
    if (d === "sent") return <CheckCheck className="w-3 h-3 opacity-70" />;
    return <Check className="w-3 h-3 opacity-50" />;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />
      <div className="relative z-[1] flex flex-col h-screen max-w-3xl mx-auto">
        <header className="glass-panel flex items-center gap-3 px-4 py-3 sticky top-0 rounded-b-2xl">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-foreground leading-tight">{t("community.title")}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/50"}`} />
              {live ? t("community.live") : t("community.reconnecting")}
            </p>
          </div>
          {isStaff && (
            <button
              onClick={() => setQueueOpen((o) => !o)}
              className="relative glass-panel rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 hover:text-primary"
            >
              <ShieldAlert className="w-4 h-4 inline mr-1 text-amber-400" />
              {t("community.queue")}
              {openHigh > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-[10px] text-white flex items-center justify-center px-1">
                  {openHigh}
                </span>
              )}
            </button>
          )}
          <LanguageSwitcher />
        </header>

        {isStaff && queueOpen && (
          <div className="glass-card mx-3 mt-3 p-3">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-display font-semibold text-foreground flex-1">{t("community.queue")}</h2>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectedReports.length === reports.length && reports.length > 0}
                  onChange={(e) => setSelectedReports(e.target.checked ? reports.map((r) => r._id) : [])}
                />
                All
              </label>
              <button onClick={() => setQueueOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            {selectedReports.length > 0 && (
              <div className="mb-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-foreground">{selectedReports.length} {t("community.selected")}</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => setPendingBatch("hide")}>{t("community.batchHide")}</Button>
                  <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => setPendingBatch("delete")}>{t("community.batchDelete")}</Button>
                  <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[11px]" onClick={() => setPendingBatch("reviewed")}>{t("community.markReviewed")}</Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {uniqueMessages.size} messages · {authorCount} authors · {highCount} high priority
                </p>
              </div>
            )}


            <div className="max-h-64 overflow-y-auto space-y-2">
              {queueLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
              ) : reports.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">{t("community.queueEmpty")}</p>
              ) : (
                reports.map((r) => (
                  <label
                    key={r._id}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${
                      r.priority === "high" ? "border-destructive/40 bg-destructive/5"
                      : r.priority === "medium" ? "border-amber-500/35 bg-amber-500/5"
                      : "border-primary/12 bg-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedReports.includes(r._id)}
                      onChange={(e) => setSelectedReports((s) => (e.target.checked ? [...s, r._id] : s.filter((x) => x !== r._id)))}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-foreground">{r.messageAuthor}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {(r.priority || "low").toUpperCase()} · {r.reportCount || 1} {t("community.reportsCount")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 break-words mt-0.5">{r.messageText}</p>
                      <p className="text-[11px] text-amber-400 mt-0.5">{r.reason}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 relative">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">{t("community.empty")}</div>
          ) : (
            messages.map((m) => {
              const mine = m.userId === myId;
              const badge = roleBadge(m.role);
              return (
                <div key={m.clientId || m._id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <div className="w-9 h-9 shrink-0 rounded-xl glass-bubble flex items-center justify-center text-[11px] font-bold text-primary">
                    {initials(m.username)}
                  </div>
                  <div className={`max-w-[78%] group ${mine ? "items-end" : ""} flex flex-col`}>
                    <div className={`flex items-center gap-2 mb-1 ${mine ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs font-semibold text-foreground">{mine ? "You" : m.username}</span>
                      {badge && <span className={`text-[9px] px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${m.hidden ? "opacity-50 line-through" : ""} ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "glass-bubble text-foreground rounded-tl-sm"
                      }`}
                    >
                      {m.replyTo && (
                        <div className={`mb-2 pl-2 border-l-2 text-xs opacity-80 ${mine ? "border-primary-foreground/50" : "border-primary/50"}`}>
                          <span className="font-semibold">{m.replyToUsername}</span>
                          <p className="line-clamp-2">{m.replyToText}</p>
                        </div>
                      )}
                      {m.text}
                    </div>

                    {mine && (
                      <button
                        onClick={() => m.delivery === "failed" && retry(m)}
                        className={`mt-1 flex items-center gap-1 text-[10px] ${
                          m.delivery === "failed" ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {deliveryIcon(m.delivery)}
                        {m.delivery === "sending" ? t("community.sending") : m.delivery === "failed" ? t("community.failed") : t("community.sent")}
                      </button>
                    )}

                    <div className={`flex gap-3 mt-1 opacity-0 group-hover:opacity-100 transition ${mine ? "flex-row-reverse" : ""}`}>
                      <button onClick={() => setReplyTo(m)} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
                        <Reply className="w-3 h-3" /> {t("community.reply")}
                      </button>
                      {!mine && (
                        <button onClick={() => report(m._id)} className="text-[11px] text-muted-foreground hover:text-amber-400 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> {t("community.report")}
                        </button>
                      )}
                      {isStaff && (
                        <button onClick={() => toggleHide(m)} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
                          {m.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {m.hidden ? t("community.unhide") : t("community.hide")}
                        </button>
                      )}
                      {(mine || isStaff) && (
                        <button onClick={() => remove(m._id)} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> {t("community.delete")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {!atBottom && (
          <button
            onClick={() => scrollDown()}
            className="glass-panel absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium text-primary flex items-center gap-2 shadow-xl"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            {unseen > 0 ? `${unseen} ${t("community.newMessages")}` : t("community.newMessages")}
          </button>
        )}

        <div className="glass-panel px-3 py-3 rounded-t-2xl">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl glass-bubble">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-primary font-semibold">{replyTo.username}</p>
                <p className="text-xs text-muted-foreground truncate">{replyTo.text}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={t("community.placeholder")}
              className="glass-input flex-1 resize-none max-h-32 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
            <Button onClick={send} disabled={sending || !text.trim()} className="h-12 w-12 rounded-2xl p-0 shrink-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {pendingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
          <div className="glass-card w-full max-w-sm p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className={`w-5 h-5 ${pendingBatch === "delete" ? "text-destructive" : "text-amber-400"}`} />
              <h3 className="font-display font-semibold text-foreground flex-1">{batchLabel[pendingBatch]}</h3>
              <button onClick={() => setPendingBatch(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-foreground/90 mb-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Reports affected</span><span className="font-semibold">{selectedReports.length}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {pendingBatch === "delete" ? "Messages to delete" : pendingBatch === "hide" ? "Messages to hide" : "Messages touched"}
                </span>
                <span className="font-semibold">{uniqueMessages.size}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Authors</span><span className="font-semibold">{authorCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">High priority</span><span className="font-semibold text-destructive">{highCount}</span></div>
            </div>

            {pendingBatch === "delete" && (
              <p className="text-[11px] text-destructive mb-3">This permanently removes the messages and cannot be undone.</p>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setPendingBatch(null)} disabled={batchRunning}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                variant={pendingBatch === "delete" ? "destructive" : "default"}
                disabled={batchRunning}
                onClick={() => runBatch(pendingBatch)}
              >
                {batchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
