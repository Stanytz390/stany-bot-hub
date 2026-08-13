import { useEffect, useState } from "react";
import { Bell, Loader2, Plus, Send, Trash2, Pencil, EyeOff, Eye } from "lucide-react";
import {
  adminGetNotifications, adminCreateNotification, adminUpdateNotification, adminDeleteNotification,
  type AppNotification,
} from "@/lib/api";
import { useToast } from "@/hooks/useToast";

const EMPTY = { title: "", body: "", url: "", level: "info" };

/** Admin broadcast composer + list. Editing is opt-in via the Edit button. */
export function AdminNotifications() {
  const { showToast } = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    setItems(await adminGetNotifications());
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const send = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await adminCreateNotification(form);
      showToast("Notification sent to all users", "success");
      setForm({ ...EMPTY });
      setComposerOpen(false);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not send", "error");
    }
    setSaving(false);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await adminUpdateNotification(id, editForm);
      showToast("Notification updated", "success");
      setEditingId(null);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not update", "error");
    }
    setSaving(false);
  };

  const toggleActive = async (n: AppNotification) => {
    await adminUpdateNotification(n._id, { active: !n.active });
    await load();
  };

  const remove = async (id: string) => {
    await adminDeleteNotification(id);
    showToast("Notification deleted", "success");
    await load();
  };

  const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Bell className="h-5 w-5 text-primary" /> Notifications
        </h2>
        <button
          onClick={() => setComposerOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New broadcast
        </button>
      </div>

      {composerOpen && (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-card p-4">
          <input className={field} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={field} rows={3} placeholder="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="Link (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <select className={field} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <button
            onClick={send}
            disabled={saving || !form.title.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send to all users
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n._id} className="rounded-2xl border border-border bg-card p-4">
              {editingId === n._id ? (
                <div className="space-y-3">
                  <input className={field} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  <textarea className={field} rows={3} value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} />
                  <input className={field} placeholder="Link" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(n._id)} disabled={saving}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-45">Save</button>
                    <button onClick={() => setEditingId(null)} className="rounded-xl border border-border px-4 py-2 text-sm text-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{n.title}</p>
                    {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()} · {n.active ? "Visible" : "Hidden"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button aria-label="Edit" onClick={() => { setEditingId(n._id); setEditForm({ title: n.title, body: n.body, url: n.url, level: n.level }); }}
                      className="rounded-lg border border-primary/25 p-2 text-primary"><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Toggle visibility" onClick={() => toggleActive(n)}
                      className="rounded-lg border border-border p-2 text-muted-foreground">
                      {n.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button aria-label="Delete" onClick={() => remove(n._id)}
                      className="rounded-lg border border-destructive/30 p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
