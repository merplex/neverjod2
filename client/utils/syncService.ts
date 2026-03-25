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

// --- Push local data to server ---

export async function syncPush(token: string) {
  const categories = JSON.parse(localStorage.getItem("app_categories") || "[]");
  const accounts = JSON.parse(localStorage.getItem("app_accounts") || "[]");
  const rawTxns = JSON.parse(localStorage.getItem("app_transactions") || "[]");

  const now = new Date().toISOString();

  const transactions = rawTxns.map((tx: any) => ({
    ...tx,
    fingerprint: tx.fingerprint || makeFingerprint(tx),
    updated_at: tx.updated_at || now,
  }));

  const catsWithMeta = categories.map((c: any) => ({
    ...c,
    updated_at: c.updated_at || now,
  }));

  const accsWithMeta = accounts.map((a: any) => ({
    ...a,
    updated_at: a.updated_at || now,
  }));

  const res = await fetch(`${API_BASE}/sync/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      categories: catsWithMeta,
      accounts: accsWithMeta,
      transactions,
    }),
  });
  if (!res.ok) throw new Error("Push failed");
  return true;
}

// --- Pull server data to local ---

export async function syncPull(token: string) {
  const lastSync = localStorage.getItem("last_sync_at") || null;

  const res = await fetch(`${API_BASE}/sync/pull`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ last_sync_at: lastSync }),
  });
  if (!res.ok) throw new Error("Pull failed");

  const data = await res.json();

  // Merge categories
  if (data.categories?.length) {
    const local: any[] = JSON.parse(localStorage.getItem("app_categories") || "[]");
    for (const serverCat of data.categories) {
      if (serverCat.deleted_at) {
        const idx = local.findIndex((c) => c.id === serverCat.id);
        if (idx !== -1) local.splice(idx, 1);
      } else {
        const idx = local.findIndex((c) => c.id === serverCat.id);
        if (idx !== -1) {
          if (!local[idx].updated_at || local[idx].updated_at < serverCat.updated_at) {
            local[idx] = { ...local[idx], ...serverCat };
          }
        } else {
          local.push(serverCat);
        }
      }
    }
    localStorage.setItem("app_categories", JSON.stringify(local));
  }

  // Merge accounts
  if (data.accounts?.length) {
    const local: any[] = JSON.parse(localStorage.getItem("app_accounts") || "[]");
    for (const serverAcc of data.accounts) {
      if (serverAcc.deleted_at) {
        const idx = local.findIndex((a) => a.id === serverAcc.id);
        if (idx !== -1) local.splice(idx, 1);
      } else {
        const idx = local.findIndex((a) => a.id === serverAcc.id);
        if (idx !== -1) {
          if (!local[idx].updated_at || local[idx].updated_at < serverAcc.updated_at) {
            local[idx] = { ...local[idx], ...serverAcc };
          }
        } else {
          local.push(serverAcc);
        }
      }
    }
    localStorage.setItem("app_accounts", JSON.stringify(local));
  }

  // Merge transactions
  if (data.transactions?.length) {
    const local: any[] = JSON.parse(localStorage.getItem("app_transactions") || "[]");
    for (const serverTx of data.transactions) {
      if (serverTx.deleted_at) {
        const idx = local.findIndex((t) => t.id === serverTx.id);
        if (idx !== -1) local.splice(idx, 1);
      } else {
        const idx = local.findIndex((t) => t.id === serverTx.id);
        if (idx !== -1) {
          if (!local[idx].updated_at || local[idx].updated_at < serverTx.updated_at) {
            local[idx] = { ...local[idx], ...serverTx };
          }
        } else {
          local.push(serverTx);
        }
      }
    }
    localStorage.setItem("app_transactions", JSON.stringify(local));
  }

  localStorage.setItem("last_sync_at", data.server_time);
  return true;
}

// --- Full sync (push then pull) ---

export async function syncAll(token: string): Promise<void> {
  await syncPush(token);
  await syncPull(token);
}
