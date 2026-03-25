const API_BASE = "/api";

// --- Auth ---

export async function apiRegister(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Register failed");
  return data as { token: string; email: string };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data as { token: string; email: string };
}

// --- Fingerprint ---

export function makeFingerprint(tx: any): string {
  return [
    tx.date?.toString().slice(0, 10),
    tx.time || "",
    tx.amount?.toString() || "",
    tx.categoryId || "",
    tx.accountId || "",
  ].join("|");
}

// --- Merge helper (O(n) via Map) ---

function mergeIntoLocal(storageKey: string, serverItems: any[]) {
  const local: any[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const localMap = new Map(local.map((item) => [item.id, item]));
  for (const serverItem of serverItems) {
    if (serverItem.deleted_at) {
      localMap.delete(serverItem.id);
    } else {
      const existing = localMap.get(serverItem.id);
      if (!existing || !existing.updated_at || existing.updated_at < serverItem.updated_at) {
        localMap.set(serverItem.id, { ...(existing || {}), ...serverItem });
      }
    }
  }
  localStorage.setItem(storageKey, JSON.stringify(Array.from(localMap.values())));
}

// --- Push local data to server ---

export async function syncPush(token: string) {
  const now = new Date().toISOString();
  const categories = (JSON.parse(localStorage.getItem("app_categories") || "[]") as any[])
    .map((c) => ({ ...c, updated_at: c.updated_at || now }));
  const accounts = (JSON.parse(localStorage.getItem("app_accounts") || "[]") as any[])
    .map((a) => ({ ...a, updated_at: a.updated_at || now }));
  // Derive type from category if not stored on transaction
  const transactions = (JSON.parse(localStorage.getItem("app_transactions") || "[]") as any[])
    .map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const type = tx.type || cat?.type || "expense";
      return { ...tx, type, fingerprint: tx.fingerprint || makeFingerprint(tx), updated_at: tx.updated_at || now };
    });

  const res = await fetch(`${API_BASE}/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ categories, accounts, transactions }),
  });
  if (!res.ok) throw new Error("Push failed");
  return true;
}

// --- Pull server data to local ---

export async function syncPull(token: string) {
  const lastSync = localStorage.getItem("last_sync_at") || null;
  const res = await fetch(`${API_BASE}/sync/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ last_sync_at: lastSync }),
  });
  if (!res.ok) throw new Error("Pull failed");

  const data = await res.json();
  if (data.categories?.length) mergeIntoLocal("app_categories", data.categories);
  if (data.accounts?.length) mergeIntoLocal("app_accounts", data.accounts);
  if (data.transactions?.length) mergeIntoLocal("app_transactions", data.transactions);
  localStorage.setItem("last_sync_at", data.server_time);
  return true;
}

// --- Full sync (push then pull) ---

export async function syncAll(token: string): Promise<void> {
  await syncPush(token);
  await syncPull(token);
}
