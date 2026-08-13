import { useEffect, useState } from "react";
import { Loader2, Database, Download, RotateCcw, Trash2, CheckSquare, Square, HardDriveDownload } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  adminListBackups, adminBackupCollections, adminCreateBackup,
  adminRestoreBackup, adminDeleteBackups, backupDownloadUrl,
} from "@/lib/api";

interface BackupRow {
  _id: string;
  name: string;
  totalDocuments: number;
  sizeBytes: number;
  collections: { name: string; count: number }[];
  createdAt: string;
}

function human(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function AdminBackups() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [cols, setCols] = useState<{ name: string; count: number }[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([adminListBackups(), adminBackupCollections()])
      .then(([b, c]) => {
        if (Array.isArray(b)) setRows(b);
        if (Array.isArray(c)) { setCols(c); setPicked(c.map((x: { name: string }) => x.name)); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const togglePick = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const allPicked = cols.length > 0 && picked.length === cols.length;

  const toggleSel = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = rows.length > 0 && selected.length === rows.length;

  const create = async () => {
    setBusy(true);
    const res = await adminCreateBackup(undefined, picked);
    setBusy(false);
    if (res?.ok) { showToast(`Backup created — ${res.totalDocuments} documents`, "success"); load(); }
    else showToast(res?.error || "Backup failed", "error");
  };

  const restore = async (id: string) => {
    if (!confirm("Restore this backup? Existing documents with the same IDs will be overwritten.")) return;
    const res = await adminRestoreBackup(id);
    if (res?.ok) showToast("Backup restored", "success");
    else showToast(res?.error || "Restore failed", "error");
  };

  const remove = async (ids: string[]) => {
    if (!ids.length) { showToast("Select at least one backup", "error"); return; }
    if (!confirm(`Delete ${ids.length} backup(s)?`)) return;
    const res = await adminDeleteBackups(ids);
    if (res?.ok) { showToast("Deleted", "success"); setSelected([]); load(); }
    else showToast(res?.error || "Failed", "error");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-[#0a0a0f]/60 p-5">
        <h3 className="font-display mb-1 font-semibold text-white">MongoDB backup</h3>
        <p className="mb-4 text-xs text-muted-foreground">Choose collections to snapshot, then create, download or restore.</p>

        <button
          onClick={() => setPicked(allPicked ? [] : cols.map((c) => c.name))}
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-primary/25 px-3 py-1.5 text-xs text-primary"
        >
          {allPicked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Mark all collections
        </button>

        <div className="flex flex-wrap gap-2">
          {cols.map((c) => (
            <button
              key={c.name}
              onClick={() => togglePick(c.name)}
              className={`rounded-full px-3 py-1.5 text-xs ${picked.includes(c.name) ? "bg-primary text-white" : "border border-primary/25 text-primary"}`}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </div>

        <button onClick={create} disabled={busy || !picked.length} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />} Create backup
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelected(allSelected ? [] : rows.map((r) => r._id))}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/25 px-3 py-1.5 text-xs text-primary"
        >
          {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Mark all
        </button>
        <button onClick={() => remove(selected)} className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white">Delete selected</button>
        <span className="text-xs text-muted-foreground">{selected.length} selected</span>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : (
        <div className="space-y-2">
          {rows.map((b) => (
            <div key={b._id} className="flex items-center gap-3 rounded-xl border border-primary/15 bg-[#0a0a0f]/60 p-3">
              <button onClick={() => toggleSel(b._id)} className="text-primary">
                {selected.includes(b._id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
              </button>
              <Database className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{b.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {b.totalDocuments} docs · {human(b.sizeBytes)} · {b.collections?.length || 0} collections · {new Date(b.createdAt).toLocaleString()}
                </p>
              </div>
              <a href={backupDownloadUrl(b._id)} className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-primary"><Download className="h-4 w-4" /></a>
              <button onClick={() => restore(b._id)} className="shrink-0 rounded-lg bg-emerald-600/20 px-2 py-1.5 text-emerald-300"><RotateCcw className="h-4 w-4" /></button>
              <button onClick={() => remove([b._id])} className="shrink-0 rounded-lg bg-red-600/20 px-2 py-1.5 text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">No backups yet.</p>}
        </div>
      )}
    </div>
  );
}
