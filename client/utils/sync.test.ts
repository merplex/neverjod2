import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- fake localStorage per "device" -------------------------------------------------------
class MemStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return k in this.data ? this.data[k] : null; }
  setItem(k: string, v: string) { this.data[k] = String(v); }
  removeItem(k: string) { delete this.data[k]; }
}
(globalThis as any).Storage = MemStorage;
const deviceA = new MemStorage();
const deviceB = new MemStorage();
const use = (d: MemStorage) => { (globalThis as any).localStorage = d; (globalThis as any).window = { localStorage: d, dispatchEvent: () => {} }; };
use(deviceA);
(globalThis as any).CustomEvent = class { constructor(public type: string) {} };
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web" } }));

// ---- fake server with the real server's rules -----------------------------------------------
// upsert only if stored.updated_at < incoming.updated_at; synced_at = server write time;
// pull returns rows with synced_at > cursor; cursor = server time (minus margin) before reading.
type Row = any;
let rows: Map<string, Row>;
let pushLog: any[];
let gate: Promise<void> | null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fakeFetch(url: string, init: any) {
  const body = JSON.parse(init.body);
  const run = async () => {
    if (gate) await gate;
    if (url.endsWith("/sync/push")) {
      pushLog.push(body);
      for (const [kind, list] of [["c", body.categories], ["a", body.accounts], ["t", body.transactions], ["r", body.repeatTransactions]] as const) {
        for (const item of list || []) {
          const key = `${kind}:${body.ledger_id}:${item.id}`;
          const cur = rows.get(key);
          if (!cur || new Date(cur.updated_at) < new Date(item.updated_at)) {
            rows.set(key, { ...item, kind, ledger: body.ledger_id, deleted_at: item.deleted_at || null, synced_at: Date.now() });
          }
        }
      }
      return { ok: true, json: async () => ({ ok: true }) };
    }
    if (url.endsWith("/sync/pull")) {
      const since = body.last_sync_at ? new Date(body.last_sync_at).getTime() : 0;
      const cursor = new Date(Date.now() - 30).toISOString();
      const pick = (k: string) => Array.from(rows.values())
        .filter((r) => r.kind === k && r.ledger === body.ledger_id && r.synced_at > since)
        .map(({ kind, ledger, synced_at, ...r }) => r);
      return { ok: true, json: async () => ({
        categories: pick("c"), accounts: pick("a"), transactions: pick("t"), repeatTransactions: pick("r"),
        isPremium: true, server_time: cursor,
      }) };
    }
    if (url.endsWith("/ledgers")) return { ok: true, json: async () => ({ ledgers: [] }) };
    throw new Error("unexpected " + url);
  };
  return run();
}

const seed = (d: MemStorage) => {
  d.data = {};
  d.setItem("app_premium", "true");
  d.setItem("app_accounts", JSON.stringify([{ id: "a1", name: "Cash", balance: 100 }]));
  d.setItem("app_categories", JSON.stringify([{ id: "food", name: "Food", type: "expense" }]));
  d.setItem("app_transactions", "[]");
};
const txns = (d: MemStorage) => JSON.parse(d.getItem("app_transactions") || "[]");

let svc: typeof import("./syncService");
beforeEach(async () => {
  rows = new Map(); pushLog = []; gate = null;
  (globalThis as any).fetch = vi.fn(fakeFetch);
  seed(deviceA); seed(deviceB); use(deviceA);
  svc = await import("./syncService");
});

describe("sync with action timestamps", () => {
  it("after the first sync, only changed records are pushed, with their own edit time", async () => {
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "t1", categoryId: "food", accountId: "a1", amount: 10, date: "2026-11-01T03:00:00.000Z" }, { id: "t2", categoryId: "food", accountId: "a1", amount: 20, date: "2026-11-01T04:00:00.000Z" }]));
    await svc.syncAll("tok");
    await sleep(5);
    const editedAt = new Date().toISOString(); // user edits now (after the sync)
    await sleep(5);
    const list = txns(deviceA); list[0] = { ...list[0], amount: 15, updated_at: editedAt };
    deviceA.setItem("app_transactions", JSON.stringify(list));
    pushLog = [];
    await svc.syncPush("tok");
    expect(pushLog).toHaveLength(1);
    expect(pushLog[0].transactions.map((t: any) => [t.id, t.updated_at])).toEqual([["t1", editedAt]]);
    expect(pushLog[0].accounts).toEqual([]);
    // nothing changed → no request at all
    pushLog = [];
    await svc.syncPush("tok");
    expect(pushLog).toHaveLength(0);
  });

  it("a delete made while a push is in flight is not resurrected", async () => {
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "x", categoryId: "food", accountId: "a1", amount: 50, date: "2026-11-01T03:00:00.000Z" }]));
    await svc.syncAll("tok");
    await sleep(5);
    // make x dirty so it's in the next push, then delete it while that push is in flight
    deviceA.setItem("app_transactions", JSON.stringify([{ ...txns(deviceA)[0], description: "edit" }]));
    let open!: () => void; gate = new Promise((r) => (open = r));
    const p = svc.syncPush("tok");
    await sleep(1);
    svc.markDeleted("transaction", txns(deviceA)[0]);
    deviceA.setItem("app_transactions", "[]");
    open(); await p; gate = null;
    await sleep(5);
    await svc.syncAll("tok");
    await svc.syncAll("tok");
    expect(txns(deviceA)).toEqual([]);
    expect(rows.get("t:main:x").deleted_at).toBeTruthy();
  });

  it("a start-balance edit made while a push is in flight is kept", async () => {
    await svc.syncAll("tok");
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "n", categoryId: "food", accountId: "a1", amount: 1, date: "2026-11-01T03:00:00.000Z" }]));
    let open!: () => void; gate = new Promise((r) => (open = r));
    const p = svc.syncPush("tok");
    await sleep(1);
    deviceA.setItem("app_accounts", JSON.stringify([{ ...JSON.parse(deviceA.getItem("app_accounts")!)[0], balance: 250, updated_at: new Date().toISOString() }]));
    open(); await p; gate = null;
    await sleep(5);
    await svc.syncAll("tok");
    expect(JSON.parse(deviceA.getItem("app_accounts")!)[0].balance).toBe(250);
    expect(rows.get("a:main:a1").balance).toBe(250);
  });

  it("an unsynced local edit isn't overwritten by an older server copy on pull", async () => {
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "t1", categoryId: "food", accountId: "a1", amount: 10, date: "2026-11-01T03:00:00.000Z" }]));
    await svc.syncAll("tok");
    await sleep(5);
    // edit via a path that does NOT stamp updated_at (e.g. moving to account_deleted)
    deviceA.setItem("app_transactions", JSON.stringify([{ ...txns(deviceA)[0], accountId: "account_deleted" }]));
    // pull comes back with the old server row re-sent (cursor margin) — must not revert
    deviceA.removeItem("last_sync_at"); deviceA.setItem("last_sync_at", new Date(0).toISOString());
    await svc.syncPull("tok");
    expect(txns(deviceA)[0].accountId).toBe("account_deleted");
    await svc.syncPush("tok");
    expect(rows.get("t:main:t1").accountId).toBe("account_deleted");
  });

  it("two devices: the later action wins even if it reaches the server first", async () => {
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "t1", categoryId: "food", accountId: "a1", amount: 10, date: "2026-11-01T03:00:00.000Z" }]));
    await svc.syncAll("tok");
    use(deviceB); await svc.syncAll("tok");
    expect(txns(deviceB)[0].amount).toBe(10);
    // A edits at 10:00 (offline), B edits at 10:05 and syncs first
    use(deviceA);
    deviceA.setItem("app_transactions", JSON.stringify([{ ...txns(deviceA)[0], amount: 11, updated_at: "2026-11-03T10:00:00.000Z" }]));
    use(deviceB);
    deviceB.setItem("app_transactions", JSON.stringify([{ ...txns(deviceB)[0], amount: 12, updated_at: "2026-11-03T10:05:00.000Z" }]));
    await svc.syncAll("tok");
    await sleep(5);
    use(deviceA); await svc.syncAll("tok");
    expect(rows.get("t:main:t1").amount).toBe(12);
    expect(txns(deviceA)[0].amount).toBe(12);
  });
});

describe("auto push after an action", () => {
  it("pushes ~1s after a data write, and sync's own writes don't loop", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const { installAutoPush } = await import("./autoPush");
      installAutoPush();
      deviceA.setItem("cloud_token", "tok");
      deviceA.setItem("sync_auto_enabled", "true");
      deviceA.setItem("last_sync_at", new Date(0).toISOString());
      pushLog = [];
      deviceA.setItem("app_transactions", JSON.stringify([{ id: "q", categoryId: "food", accountId: "a1", amount: 5, date: "2026-11-01T03:00:00.000Z" }]));
      deviceA.setItem("app_transactions", JSON.stringify([{ id: "q", categoryId: "food", accountId: "a1", amount: 6, date: "2026-11-01T03:00:00.000Z" }]));
      expect(pushLog).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1100);
      await vi.runAllTimersAsync();
      expect(pushLog).toHaveLength(1);
      expect(pushLog[0].transactions.map((t: any) => t.amount)).toEqual([6]);
      await vi.advanceTimersByTimeAsync(5000);
      expect(pushLog).toHaveLength(1); // the push's own bookkeeping writes didn't schedule another
    } finally {
      vi.useRealTimers();
    }
  });
});
