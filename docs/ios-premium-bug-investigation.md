# iOS Premium Status Bug — Investigation Notes (2026-07-27)

## Report

User completes purchase on iOS: taps subscribe, confirms with the system
purchase sheet (double-click side button + Face ID), transaction appears to
go through. App still shows "free". Checking the DB, `users.is_premium` is
still `false` for this account. Tapping "Restore" prompts for an Apple ID
password instead of Face ID. This same Apple ID/device successfully pays for
in-app purchases in other apps via the same side-button + Face ID gesture, so
the device-level purchase authentication is not the problem.

Two asks from the report:
1. If payment/verification fails, the app should show a warning.
2. Restore should use whatever auth method (Face ID/password) the user
   normally uses — not force password when Face ID is otherwise used.

## Root cause (leading hypothesis) — backend/client version mismatch

Commit `b5f80f6` ("feat: add Google Play Billing for Android...", 2026-07-26)
made `POST /api/subscription/verify` **require** a `platform` field:

```ts
// server/routes/subscription.ts
if (platform !== "ios" && platform !== "android") {
  return res.status(400).json({ error: "invalid platform" });
}
```

The same commit updated the client to start sending it
(`client/utils/syncService.ts`):

```diff
-    body: JSON.stringify({ receipt }),
+    body: JSON.stringify({ receipt, platform: Capacitor.getPlatform() }),
```

Before this commit, the client only ever sent `{ receipt }`.

The backend (Railway) auto-deploys on push, so the stricter check went live
immediately. The iOS app binary currently distributed via the App Store is
`MARKETING_VERSION 3.4` (pre-`b5f80f6`), which still sends the old
`{ receipt }` payload without `platform`. `3.5` (which contains the fix) was
only bumped in the same commit yesterday and almost certainly has not cleared
App Store review yet.

Net effect: **every iOS purchase/restore verify call from the currently-live
app build gets rejected with HTTP 400 "invalid platform"**, immediately after
the Apple-side purchase already succeeded (money likely charged). This lines
up with the timing of the report and would explain a sudden total drop in
successful purchases right after this deploy.

## Secondary architectural issue

`ios/App/App/IAPPlugin.swift:44` calls `transaction.finish()` immediately
after a verified StoreKit purchase, **before** the app has confirmed the
purchase with the backend. Apple's guidance is to finish only after your own
server has recorded/granted entitlement. Practical effect: if the
`/subscription/verify` call fails for any reason (this bug, a dropped
connection, an expired JWT, a transient DB error), the transaction is already
closed on Apple's side and won't be redelivered via `Transaction.updates`.
The only recovery path is "Restore Purchases".

## Restore prompting for password instead of Face ID

`restorePurchases()` calls `AppStore.sync()`, which forces a full StoreKit
account resync with Apple — a heavier operation than the per-purchase
confirmation sheet, and it is StoreKit/iOS (not app code) that decides
whether that resync prompts Face ID or an Apple ID password. Not directly
controllable via the app. Possible mitigation: try
`Transaction.currentEntitlements` first (reads the local cache, no forced
resync) and only fall back to `AppStore.sync()` if nothing is found locally.

## "Should show a warning on failure"

`client/pages/Settings.tsx` already has a `purchaseError` state populated in
the `catch` blocks of `executePurchase` / `handleRestorePurchase`, rendered
at lines 1042-1043. So a failure (including "invalid platform") should
already surface *some* text — just small, unstyled, and not user-friendly
wording. Worth revisiting once the root cause above is fixed, to confirm
users actually notice it and that the copy is clear.

## Not yet confirmed

Could not query the production Postgres (`DATABASE_URL` in `.env`, Railway)
directly from this sandbox — raw Postgres TCP is blocked by the environment's
network policy (attempts to `psql` timed out). Worth confirming directly:
- `original_transaction_id`, `store`, `auto_renew` on the affected user's row.
- Whether any other user row shares the same `original_transaction_id` +
  `store` (would indicate the "last restore wins" ownership-transfer logic in
  `subscription.ts` reassigned it away — relevant since `server/db.ts:147-154`
  hardcodes `premsak.c@gmail.com` as always-premium and multiple test/admin
  accounts have shared sandbox Apple IDs in the past per commit history).
- Server logs around the purchase time for `invalid platform` 400s.

## Suggested fix direction (not yet implemented)

Make `/api/subscription/verify` backward-compatible: default `platform` to
`"ios"` when omitted instead of rejecting, so currently-live app builds can
complete purchases while `3.5` clears App Store review. This is a
server-only change and takes effect without waiting on a new App Store
release. The `finish()`-before-verify ordering and the restore-auth-method
UX are separate, lower-urgency follow-ups.
