import { useCallback, useEffect, useState } from "react";
import { Loader2, Ban, Trash2, RotateCcw, Search } from "lucide-react";
import { adminGetRepos, adminBlockRepo, adminUnblockRepo, adminDeleteRepo, type ManualRepoRecord } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

/** Owner review of every user-supplied GitHub repo deployed on the platform. */
export function AdminRepos() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ManualRepoRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetRepos(page, search);
      setItems(data.items || []);
      setPages(data.pages || 1);
    } catch { showToast("Could not load repositories", "error"); }
    setLoading(false);
  }, [page, search, showToast]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try { await fn(); await load(); } catch { showToast("Action failed", "error"); }
    setBusy("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search repo, user or app name"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No custom repositories deployed yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <a href={r.repoUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-primary hover:underline">
                  {r.repoKey}
                </a>
                <p className="truncate text-xs text-muted-foreground">
                  {r.appName} · {r.username ? `@${r.username}` : r.userEmail} · {r.costTx} SQ
                </p>
                {r.blocked && <p className="text-xs text-destructive">Blocked: {r.blockReason}</p>}
              </div>
              {r.blocked ? (
                <button onClick={() => act(r._id, () => adminUnblockRepo(r._id))} disabled={busy === r._id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Unblock
                </button>
              ) : (
                <button onClick={() => act(r._id, () => adminBlockRepo(r._id, "Blocked by admin"))} disabled={busy === r._id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground">
                  <Ban className="h-3.5 w-3.5" /> Block
                </button>
              )}
              <button onClick={() => act(r._id, () => adminDeleteRepo(r._id))} disabled={busy === r._id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span className="text-muted-foreground">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
