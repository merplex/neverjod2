import { useEffect, useState } from "react";
import { HardDrive, Loader2, Cloud, CloudOff, RotateCcw, Trash2 } from "lucide-react";
import { useT } from "../hooks/useT";
import {
  listBackups, createBackup, deleteBackup, restoreBackup, syncBackupsToCloud, cloudEnabled, backupLedgerIds,
  MAX_BACKUPS, type DeviceBackup,
} from "../utils/deviceBackup";

// "2026/12/29 17:45:05" in the device's local time
function formatStamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function ledgerNames(ids: string[]): string {
  let list: { id: string; name: string }[] = [];
  try { list = JSON.parse(localStorage.getItem("app_ledgers") || "[]"); } catch {}
  return ids.map((id) => list.find((l) => l.id === id)?.name || (id === "main" ? "Main" : id)).join(", ");
}

type Confirm = { backup: DeviceBackup; action: "restore" | "delete" } | null;

export default function DeviceBackupCard() {
  const T = useT();
  const [backups, setBackups] = useState<DeviceBackup[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // "create" | backup id
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState(false);
  const cloud = cloudEnabled();

  const refresh = () => listBackups().then(setBackups).catch(() => setError(true));
  useEffect(() => {
    refresh();
    // Upload sets that didn't make it to the server earlier (e.g. created offline)
    syncBackupsToCloud().then(refresh).catch(() => {});
  }, []);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
      setConfirm(null);
      refresh();
    }
  };

  const onConfirm = () => {
    if (!confirm) return;
    const { backup, action } = confirm;
    if (action === "delete") return run(backup.id, () => deleteBackup(backup.id));
    return run(backup.id, async () => {
      await restoreBackup(backup.id);
      // Reload so every page re-reads the restored data (and boot sync pushes it when Auto Sync is on)
      window.location.reload();
    });
  };

  const isDelete = confirm?.action === "delete";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
          <HardDrive size={18} className="text-theme-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{T("backup.title")}</h2>
          <p className="text-xs text-slate-500">{T(cloud ? "backup.subtitle_cloud" : "backup.subtitle", { n: MAX_BACKUPS })}</p>
        </div>
      </div>

      <div className="space-y-3">
        {backups.map((b) => (
          <div key={b.id} className="flex items-center gap-2">
            {/* Wraps the timestamp onto a 2nd line when the buttons leave too little room (e.g. English) */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-snug">
                {T("backup.item")} <span className="tabular-nums whitespace-nowrap">{formatStamp(b.createdAt)}</span>
              </p>
              <p className="text-[11px] text-slate-400 leading-snug flex items-center gap-1 mt-0.5">
                {cloud && (b.uploaded
                  ? <Cloud size={11} className="text-theme-500 flex-shrink-0" aria-label={T("backup.on_cloud")} />
                  : <CloudOff size={11} className="flex-shrink-0" aria-label={T("backup.local_only")} />)}
                <span className="truncate">{T("backup.ledgers")}: {ledgerNames(backupLedgerIds(b))}</span>
              </p>
            </div>
            <button
              onClick={() => setConfirm({ backup: b, action: "restore" })}
              disabled={!!busy}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-theme-50 text-theme-700 border border-theme-200 hover:bg-theme-100 transition-colors disabled:opacity-50"
            >
              {T("backup.restore")}
            </button>
            <button
              onClick={() => setConfirm({ backup: b, action: "delete" })}
              disabled={!!busy}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {T("delete")}
            </button>
          </div>
        ))}

        {backups.length < MAX_BACKUPS && (
          <button
            onClick={() => run("create", createBackup)}
            disabled={!!busy}
            className="w-full py-2.5 rounded-xl bg-theme-50 text-theme-700 text-sm font-semibold hover:bg-theme-100 transition-colors border border-theme-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy === "create" && <Loader2 size={15} className="animate-spin" />}
            {T("backup.create")}
          </button>
        )}

        {error && <p className="text-xs text-red-500 text-center">{T("backup.failed")}</p>}
      </div>

      {/* Confirm dialog for restore / delete */}
      {confirm && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-6"
          onClick={() => !busy && setConfirm(null)}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDelete ? "bg-red-100" : "bg-theme-100"}`}>
                {isDelete
                  ? <Trash2 size={18} className="text-red-500" />
                  : <RotateCcw size={18} className="text-theme-600" />}
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {T(isDelete ? "backup.delete_title" : "backup.restore_title")}
              </h3>
            </div>
            <div className={`rounded-xl px-3 py-2 mb-3 border ${isDelete ? "bg-red-50 border-red-100" : "bg-theme-50 border-theme-100"}`}>
              <p className="text-sm font-medium text-slate-700">
                {T("backup.item")} <span className="tabular-nums">{formatStamp(confirm.backup.createdAt)}</span>
              </p>
              <p className="text-xs text-slate-500">{T("backup.ledgers")}: {ledgerNames(backupLedgerIds(confirm.backup))}</p>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {T(isDelete ? "backup.delete_confirm" : "backup.restore_confirm")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                disabled={!!busy}
                className="flex-1 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {T("cancel")}
              </button>
              <button
                onClick={onConfirm}
                disabled={!!busy}
                className={`flex-1 py-2.5 rounded-xl text-sm text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  isDelete ? "bg-red-500 hover:bg-red-600" : "bg-theme-600 hover:bg-theme-700"
                }`}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {T(isDelete ? "delete" : "backup.restore")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
