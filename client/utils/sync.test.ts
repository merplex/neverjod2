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
          const tCur = cur && new Date(cur.updated_at).getTime(), tNew = new Date(item.updated_at).getTime();
          if (!cur || tCur! < tNew || (item.deleted_at && !cur.deleted_at && tCur! <= tNew)) {
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
  (await import("./autoPush")).installAutoPush(); // stamping hook on, like in the app
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
    // A edits first (offline), B edits 5 min later and syncs first.
    // Times are relative to now: an edit stamp must be later than the last sync, so a fixed
    // date would make this test fail once the real clock passes it.
    const base = Date.now() + 60_000;
    use(deviceA);
    deviceA.setItem("app_transactions", JSON.stringify([{ ...txns(deviceA)[0], amount: 11, updated_at: new Date(base).toISOString() }]));
    use(deviceB);
    deviceB.setItem("app_transactions", JSON.stringify([{ ...txns(deviceB)[0], amount: 12, updated_at: new Date(base + 5 * 60_000).toISOString() }]));
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

describe("offline: unsent changes wait and go up with the next action", () => {
  it("a push that fails keeps its changes pending; the next push sends old + new together", async () => {
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "t1", categoryId: "food", accountId: "a1", amount: 10, date: "2026-11-01T03:00:00.000Z" }]));
    await svc.syncAll("tok");
    await sleep(5);
    // offline: edit t1 and add t2, push fails
    const list = txns(deviceA); list[0] = { ...list[0], amount: 11 };
    deviceA.setItem("app_transactions", JSON.stringify([...list, { id: "t2", categoryId: "food", accountId: "a1", amount: 20, date: "2026-11-02T03:00:00.000Z" }]));
    svc.markDeleted("category", { id: "food", name: "Food", type: "expense" });
    const editedAt = txns(deviceA)[0].updated_at;
    (globalThis as any).fetch = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    await expect(svc.syncPush("tok")).rejects.toThrow();
    // still offline, another action — still nothing sent, nothing lost
    deviceA.setItem("app_transactions", JSON.stringify([...txns(deviceA), { id: "t3", categoryId: "food", accountId: "a1", amount: 30, date: "2026-11-03T03:00:00.000Z" }]));
    await expect(svc.syncPush("tok")).rejects.toThrow();
    expect(rows.get("t:main:t1").amount).toBe(10);
    // back online, next action's push carries everything that was waiting
    (globalThis as any).fetch = vi.fn(fakeFetch);
    pushLog = [];
    await svc.syncPush("tok");
    expect(pushLog).toHaveLength(1);
    expect(pushLog[0].transactions.map((t: any) => t.id).sort()).toEqual(["t1", "t2", "t3"]);
    expect(pushLog[0].categories.some((c: any) => c.id === "food" && c.deleted_at)).toBe(true);
    // the offline edit keeps the time it was made, not the time it finally got sent
    expect(pushLog[0].transactions.find((t: any) => t.id === "t1").updated_at).toBe(editedAt);
    expect(rows.get("t:main:t1").amount).toBe(11);
  });
});

describe("multi-device: every kind of change carries its own time and reaches the other device", () => {
  const ledger2 = (d: MemStorage, key: string) => JSON.parse(d.getItem(`${key}__L2`) || "[]");

  it("category rename / keyword edit made by a plain write is stamped and synced", async () => {
    await svc.syncAll("tok");
    use(deviceB); await svc.syncAll("tok");
    await sleep(5);
    use(deviceA);
    const before = Date.now();
    deviceA.setItem("app_categories", JSON.stringify([{ id: "food", name: "Food & Drink", type: "expense", keywords: ["ข้าว"] }]));
    const cat = JSON.parse(deviceA.getItem("app_categories")!)[0];
    expect(new Date(cat.updated_at).getTime()).toBeGreaterThanOrEqual(before);
    await svc.syncPush("tok");
    await sleep(5);
    use(deviceB); await svc.syncAll("tok");
    const bCat = JSON.parse(deviceB.getItem("app_categories")!).find((c: any) => c.id === "food");
    expect(bCat.name).toBe("Food & Drink");
    expect(bCat.keywords).toEqual(["ข้าว"]);
  });

  it("account edits on two devices: the later one wins on both", async () => {
    await svc.syncAll("tok");
    use(deviceB); await svc.syncAll("tok");
    use(deviceA);
    deviceA.setItem("app_accounts", JSON.stringify([{ ...JSON.parse(deviceA.getItem("app_accounts")!)[0], balance: 300 }]));
    await sleep(5);
    use(deviceB);
    deviceB.setItem("app_accounts", JSON.stringify([{ ...JSON.parse(deviceB.getItem("app_accounts")!)[0], balance: 400 }]));
    await svc.syncAll("tok");         // B (later edit) reaches the server first
    await sleep(5);
    use(deviceA); await svc.syncAll("tok");   // A (earlier edit) arrives late → loses
    use(deviceB); await svc.syncAll("tok");
    expect(JSON.parse(deviceA.getItem("app_accounts")!)[0].balance).toBe(400);
    expect(JSON.parse(deviceB.getItem("app_accounts")!)[0].balance).toBe(400);
  });

  it("a repeat transfer keeps its from/to accounts and target ledger on the other device", async () => {
    deviceA.setItem("app_repeat_transactions", JSON.stringify([{
      id: "rt1", categoryId: "transfer", accountId: "a1", categoryName: "Bank", accountName: "Cash", amount: 500,
      repeatOption: "monthly", dayOfMonth: 1, weekday: 0, monthOfYear: 0, time: "09:00",
      startDate: "2026-12-01T02:00:00.000Z", nextDue: "2026-12-01T02:00:00.000Z",
      isTransfer: true, fromAccountId: "a1", fromAccountName: "Cash", toAccountId: "b1", toAccountName: "Bank", toLedgerId: "L2", toLedgerName: "Book 2",
    }]));
    await svc.syncAll("tok");
    use(deviceB); await svc.syncAll("tok");
    const r = JSON.parse(deviceB.getItem("app_repeat_transactions")!)[0];
    expect(r).toMatchObject({ isTransfer: true, fromAccountId: "a1", toAccountId: "b1", toLedgerId: "L2", toLedgerName: "Book 2" });
  });

  it("a cross-ledger transfer leg written into ledger 2 syncs to ledger 2 with its pair info", async () => {
    deviceA.setItem("app_transactions__L2", JSON.stringify([{ id: "tr_in", categoryId: "transfer_in", accountId: "b1", amount: 500,
      date: "2026-11-01T03:00:00.000Z", isTransfer: true, transferRef: "transfer_1", pairLedgerId: "main", ledgerName: "Main" }]));
    await svc.syncPush("tok", false, false, "L2");
    expect(rows.get("t:L2:tr_in")).toBeTruthy();
    expect(rows.get("t:main:tr_in")).toBeUndefined();
    use(deviceB); await svc.syncPull("tok", "L2");
    expect(ledger2(deviceB, "app_transactions")[0]).toMatchObject({ id: "tr_in", transferRef: "transfer_1", pairLedgerId: "main", isTransfer: true });
    expect(txns(deviceB)).toEqual([]); // nothing leaked into the main ledger
  });

  it("the same repeat occurrence generated on two devices stays one transaction, and an edit to it survives", async () => {
    const { checkAndExecuteRepeats } = await import("./repeatTransactionService");
    const rt = { id: "r9", categoryId: "food", accountId: "a1", amount: 10, repeatOption: "monthly", dayOfMonth: 1, weekday: 0, monthOfYear: 0, time: "09:00", startDate: "2026-10-01T02:00:00.000Z", nextDue: "2026-10-01T02:00:00.000Z" };
    deviceA.setItem("app_repeat_transactions", JSON.stringify([rt]));
    deviceB.setItem("app_repeat_transactions", JSON.stringify([rt]));
    checkAndExecuteRepeats();
    // user corrects the generated amount on A and syncs
    const list = txns(deviceA); list[0] = { ...list[0], amount: 12, updated_at: new Date().toISOString() };
    deviceA.setItem("app_transactions", JSON.stringify(list));
    await svc.syncAll("tok");
    await sleep(5);
    // B was offline: generates the same occurrence late, then syncs
    use(deviceB); checkAndExecuteRepeats(); await svc.syncAll("tok");
    expect(txns(deviceB).filter((t: any) => t.repeatId === "r9")).toHaveLength(2); // Oct + Nov
    expect(txns(deviceB).find((t: any) => t.id === list[0].id).amount).toBe(12);
    expect(rows.get(`t:main:${list[0].id}`).amount).toBe(12);
  });
  it("a stale device re-firing an occurrence an older app version made (random id) ends with one copy", async () => {
    const { checkAndExecuteRepeats } = await import("./repeatTransactionService");
    const base = { id: "r7", categoryId: "food", accountId: "a1", amount: 22664, repeatOption: "monthly", dayOfMonth: 1, weekday: 0, monthOfYear: 0, time: "09:00", startDate: "2026-10-01T02:00:00.000Z" };
    // Device A (old app version) already made the Nov occurrence with a random id and synced
    deviceA.setItem("app_repeat_transactions", JSON.stringify([{ ...base, nextDue: "2026-12-01T02:00:00.000Z", lastExecuted: "2026-11-01T02:00:00.000Z" }]));
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "1730000000000_ab12c", categoryId: "food", accountId: "a1", amount: 22664, date: "2026-11-01T00:15:00.000Z", time: "07:15", isRepeat: true, repeatId: "r7" }])); // time of day edited since
    await svc.syncAll("tok");
    // Device B still has data up to Oct 31: nextDue = Nov 1 → fires on launch before its pull
    use(deviceB);
    deviceB.setItem("app_repeat_transactions", JSON.stringify([{ ...base, nextDue: "2026-11-01T02:00:00.000Z" }]));
    checkAndExecuteRepeats();
    expect(txns(deviceB)).toHaveLength(1);
    await svc.syncAll("tok");
    expect(txns(deviceB).filter((t: any) => t.repeatId === "r7").map((t: any) => t.id)).toEqual(["1730000000000_ab12c"]); // the server's copy is kept
    await svc.syncPush("tok");
    const live = Array.from(rows.values()).filter((r: any) => r.kind === "t" && r.repeatId === "r7" && !r.deleted_at);
    expect(live).toHaveLength(1);
    // and A pulls the cleanup too
    use(deviceA); await svc.syncAll("tok");
    expect(txns(deviceA).filter((t: any) => t.repeatId === "r7")).toHaveLength(1);
  });
  it("transfer legs that lost their pair info (old server) get it back from their ids and sync it up", async () => {
    const { repairTransferLinks } = await import("./transferLinks");
    deviceA.setItem("app_ledgers", JSON.stringify([{ id: "L2", name: "Book 2" }]));
    // as pulled from a server that never stored isTransfer/transferRef/pairLedgerId
    deviceA.setItem("app_transactions", JSON.stringify([{ id: "1793689223189_transfer_out", categoryId: "transfer_out", accountId: "a1", amount: 200000, date: "2026-11-03T07:00:00.000Z" }]));
    deviceA.setItem("app_transactions__L2", JSON.stringify([{ id: "1793689223190_transfer_in", categoryId: "transfer_in", accountId: "b1", amount: 200000, date: "2026-11-03T07:00:00.000Z" },
      { id: "999_transfer_in", categoryId: "transfer_in", accountId: "b1", amount: 5, date: "2026-11-03T07:00:00.000Z" }])); // no pair → untouched
    expect(repairTransferLinks()).toBe(true);
    expect(txns(deviceA)[0]).toMatchObject({ isTransfer: true, transferRef: "transfer_1793689223189", pairLedgerId: "L2", ledgerName: "Book 2" });
    expect(ledger2(deviceA, "app_transactions")[0]).toMatchObject({ isTransfer: true, transferRef: "transfer_1793689223189", pairLedgerId: "main", ledgerName: "Main" });
    expect(ledger2(deviceA, "app_transactions")[1].transferRef).toBeUndefined();
    expect(repairTransferLinks()).toBe(false); // idempotent
    await svc.syncPush("tok", false, false, "main");
    await svc.syncPush("tok", false, false, "L2");
    expect(rows.get("t:main:1793689223189_transfer_out").extra).toMatchObject({ transferRef: "transfer_1793689223189", pairLedgerId: "L2" });
    expect(rows.get("t:L2:1793689223190_transfer_in").extra).toMatchObject({ transferRef: "transfer_1793689223189", pairLedgerId: "main" });
  });
});
