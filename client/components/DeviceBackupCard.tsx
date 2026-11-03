import { useEffect, useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";
import { useT } from "../hooks/useT";
import { listBackups, createBackup, deleteBackup, restoreBackup, MAX_BACKUPS, type DeviceBackup } from "../utils/deviceBackup";

// "2026/12/29 17:45:05" in the device's local time
function formatStamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

type Confirm = { id: string; action: "restore" | "delete" } | null;

export default function DeviceBackupCard() {
  const T = useT();
  const [backups, setBackups] = useState<DeviceBackup[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // "create" | backup id
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState(false);

  const refresh = () => listBackups().then(setBackups).catch(() => setError(true));
  useEffect(() => { refresh(); }, []);

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

  const onCreate = () => run("create", createBackup);
  const onConfirm = () => {
    if (!confirm) return;
    const { id, action } = confirm;
    if (action === "delete") return run(id, () => deleteBackup(id));
    return run(id, async () => {
      await restoreBackup(id);
      // Reload so every page re-reads the restored data (and boot sync pushes it when Auto Sync is on)
      window.location.reload();
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
          <HardDrive size={18} className="text-theme-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{T("backup.title")}</h2>
          <p className="text-xs text-slate-500">{T("backup.subtitle", { n: MAX_BACKUPS })}</p>
        </div>
      </div>

      <div className="space-y-2">
        {backups.map((b) => (
          <div key={b.id}>
            <div className="flex items-center gap-2">
              {/* Wraps the timestamp onto a 2nd line when the buttons leave too little room (e.g. English) */}
              <p className="flex-1 min-w-0 text-sm text-slate-700 leading-snug">
                {T("backup.item")} <span className="tabular-nums whitespace-nowrap">{formatStamp(b.createdAt)}</span>
              </p>
              <button
                onClick={() => setConfirm({ id: b.id, action: "restore" })}
                disabled={!!busy}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-theme-50 text-theme-700 border border-theme-200 hover:bg-theme-100 transition-colors disabled:opacity-50"
              >
                {T("backup.restore")}
              </button>
              <button
                onClick={() => setConfirm({ id: b.id, action: "delete" })}
                disabled={!!busy}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {T("delete")}
              </button>
            </div>
            {confirm?.id === b.id && (
              <div className={`mt-2 rounded-xl p-3 space-y-2 border ${confirm.action === "delete" ? "border-red-200 bg-red-50" : "border-theme-200 bg-theme-50"}`}>
                <p className={`text-xs font-semibold ${confirm.action === "delete" ? "text-red-700" : "text-theme-700"}`}>
                  {T(confirm.action === "delete" ? "backup.delete_confirm" : "backup.restore_confirm")}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirm(null)}
                    className="flex-1 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                  >
                    {T("cancel")}
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={!!busy}
                    className={`flex-1 py-1.5 rounded-lg text-xs text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1 ${
                      confirm.action === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-theme-600 hover:bg-theme-700"
                    }`}
                  >
                    {busy === b.id && <Loader2 size={12} className="animate-spin" />}
                    {T(confirm.action === "delete" ? "delete" : "backup.restore")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {backups.length < MAX_BACKUPS && (
          <button
            onClick={onCreate}
            disabled={!!busy}
            className="w-full py-2.5 rounded-xl bg-theme-50 text-theme-700 text-sm font-semibold hover:bg-theme-100 transition-colors border border-theme-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy === "create" && <Loader2 size={15} className="animate-spin" />}
            {T("backup.create")}
          </button>
        )}

        {error && <p className="text-xs text-red-500 text-center">{T("backup.failed")}</p>}
      </div>
    </div>
  );
}
