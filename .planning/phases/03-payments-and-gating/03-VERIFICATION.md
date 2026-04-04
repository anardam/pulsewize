---
phase: 03-payments-and-gating
verified: 2026-03-31T16:43:00Z
status: human_needed
score: 4/4 must-haves verified (all automated checks pass)
gaps: []
human_verification:
  - test: "Complete a Razorpay subscription checkout end-to-end"
    expected: "User selects a plan, completes UPI/card/wallet payment in Razorpay popup, webhook fires, Supabase subscriptions row gains plan=pro, user is redirected back and sees Pro badge on Settings page"
    why_human: "Requires live Razorpay test credentials, network sandbox, and real browser interaction. Cannot simulate window.Razorpay popup or validate webhook delivery timing programmatically."
  - test: "Free-tier limit enforcement at 3 analyses"
    expected: "After the third analysis, the fourth attempt returns 429 + limitReached=true, the analyze page transitions to the 'upgrade' state, and UpgradePrompt renders inline with the Razorpay checkout button"
    why_human: "Requires a seeded DB with usage count = 3 for the session user, authenticated browser session, and UI state-machine observation. Integration test covers the API logic; the UI transition needs visual confirmation."
  - test: "Webhook idempotency — duplicate event-id is a no-op"
    expected: "Sending the same x-razorpay-event-id twice to POST /api/webhooks/razorpay returns 200 on the second delivery and does not double-write to processed_webhook_events or subscriptions"
    why_human: "Unit tests mock Supabase; a live idempotency check against the real DB with the UNIQUE constraint needs a staging/test Supabase instance."
  - test: "Subscription cancellation flow from Settings page"
    expected: "Pro user clicks 'Cancel subscription', CancelDialog opens, clicks 'Yes, cancel', POST /api/subscriptions/cancel calls Razorpay cancelAtCycleEnd=true, page reloads, subscription status updates"
    why_human: "Requires a live Razorpay test subscription ID in the DB and Razorpay sandbox to accept the cancel call. Cannot mock end-to-end without live credentials."
  - test: "PAY-05 checkbox in REQUIREMENTS.md should be marked complete"
    expected: "PAY-05 checkbox changed from [ ] to [x] — webhook handler with idempotency is fully implemented and tested (25/25 tests pass including 8 webhook tests)"
    why_human: "Documentation update requires human to edit REQUIREMENTS.md and update the traceability table status from Pending to Complete. The code is done; only the doc is stale."
---

# Phase 3: Payments and Gating — Verification Report

**Phase Goal:** Users can subscribe via Razorpay (global), and the freemium tier limit is reliably enforced against subscription state
**Verified:** 2026-03-31T16:43:00Z
**Status:** human_needed (all automated checks pass; payment flows require live browser + Razorpay sandbox)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can complete a Razorpay subscription checkout (UPI, cards, wallets) and gain immediate Pro access after webhook confirmation | ? HUMAN NEEDED | `POST /api/checkout` creates real subscription via `razorpay.subscriptions.create`; webhook state machine grants `plan=pro` on `subscription.charged`. Code verified, live flow pending human test. |
| 2 | A free-tier user who has used 3 analyses sees an inline upgrade prompt and cannot run a fourth analysis | ✓ VERIFIED | `analyze/route.ts` returns `429 + limitReached:true` when `check_and_increment_usage` denies; `analyze/page.tsx` transitions to `"upgrade"` state and renders `<UpgradePrompt />`. Full data flow confirmed. |
| 3 | Subscription events (charged, halted, cancelled, completed) update user access state within the same webhook delivery | ✓ VERIFIED | Webhook handler at `/api/webhooks/razorpay/route.ts` implements full state machine: `charged→pro/active`, `halted→keep-pro`, `cancelled/completed→free`. HMAC signature verified. Idempotency via `processed_webhook_events` table and `x-razorpay-event-id`. 8 tests covering all events pass. |
| 4 | User can see current plan, remaining free analyses, and cancel subscription from Settings page | ✓ VERIFIED | `settings/page.tsx` (Server Component) fetches `plan`, `status`, `current_period_end`, `provider_subscription_id` from `subscriptions` table and `analyses_used` from `usage` table. Passes all as props to `<BillingSection>`. `CancelDialog` wired to `POST /api/subscriptions/cancel`. All data sources are real DB queries. |

**Score:** 4/4 truths verified (automated); 1 truth and 4 flows need live Razorpay sandbox confirmation

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/razorpay/client.ts` | Razorpay SDK singleton with env-var guard | ✓ VERIFIED | Throws at import if `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` missing. Named export `razorpay`. 10 lines, substantive. |
| `src/lib/razorpay/types.ts` | Typed webhook payload interfaces | ✓ VERIFIED | `RazorpaySubscriptionEvent` (union of 6 events), `RazorpaySubscriptionEntity`, `RazorpayWebhookPayload`. Used by webhook route. |
| `src/app/api/checkout/route.ts` | POST endpoint creating Razorpay subscription | ✓ VERIFIED | Auth check, `razorpay.subscriptions.create` with `notes.user_id`, returns `subscriptionId`. Not a stub — real SDK call. |
| `src/app/api/webhooks/razorpay/route.ts` | Webhook handler with HMAC + idempotency + state machine | ✓ VERIFIED | Raw body `request.text()`, `Razorpay.validateWebhookSignature`, idempotency check via `processed_webhook_events`, full state machine. 104 lines, substantive. |
| `src/app/api/subscriptions/cancel/route.ts` | POST cancel route with cancelAtCycleEnd | ✓ VERIFIED | Auth check, subscription lookup, plan check, `razorpay.subscriptions.cancel(id, true)`. Fully wired. |
| `src/components/billing/UpgradePrompt.tsx` | Inline Razorpay checkout component | ✓ VERIFIED | Fetches `/api/checkout`, opens `window.Razorpay` popup with `subscription_id`. `handler` does `window.location.reload()` only (no state mutation). "use client" directive. |
| `src/components/billing/BillingSection.tsx` | Plan badge, usage count, invoices, upgrade/cancel controls | ✓ VERIFIED | Renders plan badge, `analysesUsed` count, invoice list from props, `<UpgradePrompt>` for free users, cancel button for Pro users wired to `<CancelDialog>`. |
| `src/components/billing/CancelDialog.tsx` | Confirmation modal for cancellation | ✓ VERIFIED | Modal with "Keep subscription" / "Yes, cancel" buttons, loading state, error display. Wired in `BillingSection`. |
| `src/lib/supabase/schema.sql` | `processed_webhook_events` table DDL | ✓ VERIFIED | Table definition at line 183 with `event_id TEXT NOT NULL UNIQUE`, `event_type`, `processed_at`. UNIQUE constraint is the atomic deduplication guard. |
| `src/app/(dashboard)/analyze/page.tsx` | UpgradePrompt wired on limit hit | ✓ VERIFIED | `"upgrade"` added to `AnalyzeState` union; `429 + data.limitReached` branch sets `setState("upgrade")`; `state === "upgrade"` render block shows `<UpgradePrompt />`. |
| `src/app/(dashboard)/settings/page.tsx` | BillingSection wired with live data | ✓ VERIFIED | Server Component fetches subscription, usage, and payment history from Supabase + Razorpay. Passes all props to `<BillingSection>`. No hardcoded values. |
| `src/app/api/analyze/route.ts` | Plan-aware usage limit enforcement | ✓ VERIFIED | Queries `subscriptions` before `check_and_increment_usage`; `isPro` considers `active/authenticated/halted` statuses; `usageLimit = isPro ? 999999 : 3`; returns `limitReached: true` in 429 body. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `UpgradePrompt.tsx` | `POST /api/checkout` | `fetch("/api/checkout", { method: "POST" })` | ✓ WIRED | Response consumed: `data.subscriptionId` used to open Razorpay popup |
| `analyze/page.tsx` | `UpgradePrompt` | `import` + `state === "upgrade"` render block | ✓ WIRED | Import at line 9, rendered at line 206, triggered by `429 + limitReached` at line 74 |
| `analyze/route.ts` | `subscriptions` table | `supabase.from("subscriptions").select("plan, status")` | ✓ WIRED | Result consumed: `subData?.plan === "pro"` drives `isPro` |
| `analyze/route.ts` | `check_and_increment_usage` RPC | `supabase.rpc("check_and_increment_usage", { p_user_id, p_limit: usageLimit })` | ✓ WIRED | Result consumed: `usageData?.allowed` gates the analysis |
| `webhooks/razorpay/route.ts` | `subscriptions` table | `supabase.from("subscriptions").upsert/update` | ✓ WIRED | All state machine branches write to `subscriptions`. Uses service_role client (bypasses RLS). |
| `webhooks/razorpay/route.ts` | `processed_webhook_events` table | SELECT before processing + INSERT after | ✓ WIRED | Idempotency check at line 43, insert at line 97 |
| `BillingSection.tsx` | `POST /api/subscriptions/cancel` | `fetch("/api/subscriptions/cancel", { method: "POST" })` | ✓ WIRED | Response consumed: `data.success` checked, error thrown on failure |
| `settings/page.tsx` | `BillingSection` | `import` + JSX render with all props | ✓ WIRED | All 6 props passed from live DB/Razorpay fetches |
| `settings/page.tsx` | `subscriptions` table | `supabase.from("subscriptions").select(...)` | ✓ WIRED | Result consumed for plan, status, currentPeriodEnd, providerSubscriptionId |
| `settings/page.tsx` | `usage` table | `supabase.from("usage").select("analyses_used")` | ✓ WIRED | Result consumed: `usage?.analyses_used ?? 0` |
| `settings/page.tsx` | `razorpay.payments.all` | Called with `subscription_id` filter | ✓ WIRED | Result mapped to `RazorpayInvoice[]` array, passed to `BillingSection.invoices` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `BillingSection.tsx` | `plan`, `analysesUsed`, `invoices` | Props from `settings/page.tsx` server fetch | Yes — Supabase queries + Razorpay payments API | ✓ FLOWING |
| `settings/page.tsx` | `plan`, `subscription` | `supabase.from("subscriptions").select(...)` | Yes — real DB query per authenticated user | ✓ FLOWING |
| `settings/page.tsx` | `analysesUsed` | `supabase.from("usage").select("analyses_used")` | Yes — real DB query per billing month | ✓ FLOWING |
| `settings/page.tsx` | `invoices` | `razorpay.payments.all({ subscription_id })` | Yes — live Razorpay API call, non-fatal empty fallback | ✓ FLOWING |
| `analyze/page.tsx` | `state === "upgrade"` | `response.status === 429 && data.limitReached` from `/api/analyze` | Yes — driven by real usage DB check | ✓ FLOWING |
| `analyze/route.ts` | `isPro`, `usageLimit` | `subscriptions` table query | Yes — real DB query, not hardcoded | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 25 API tests pass | `npx vitest run src/__tests__/api/` | 4 test files, 25 tests, 0 failures | ✓ PASS |
| `limitReached` flag present in analyze route 429 response | `grep -n "limitReached" src/app/api/analyze/route.ts` | Line 57: `limitReached: true` | ✓ PASS |
| Webhook reads raw body before parsing | `grep -n "request.text" webhook route` | Line 18: `const rawBody = await request.text()` | ✓ PASS |
| Cancel route uses cancelAtCycleEnd=true | `grep "subscriptions.cancel" cancel/route.ts` | `razorpay.subscriptions.cancel(sub.provider_subscription_id, true)` | ✓ PASS |
| Razorpay checkout popup | Requires live browser + Razorpay JS | Cannot verify without window.Razorpay | ? SKIP |
| Real subscription checkout flow | Requires Razorpay sandbox + live webhook delivery | Not runnable without external service | ? SKIP |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PAY-01 | 03-01, 03-03 | Razorpay subscription integration with recurring billing (global, UPI + cards + wallets) | ✓ SATISFIED | `client.ts` SDK singleton; `checkout/route.ts` creates subscription with `plan_id`; `UpgradePrompt.tsx` opens Razorpay popup with `subscription_id` |
| PAY-02 | 03-01 | REMOVED — Razorpay-only, no Stripe | ✓ ABSENT | Correctly absent from REQUIREMENTS.md — no row present |
| PAY-03 | 03-02 | Freemium gating — 3 free analyses per month | ✓ SATISFIED | `analyze/route.ts` sets `usageLimit = isPro ? 999999 : 3` and calls `check_and_increment_usage` RPC; 429 + `limitReached:true` returned on exhaustion |
| PAY-04 | 03-04, 03-05 | Usage dashboard showing remaining analyses, current plan, and upgrade prompts | ✓ SATISFIED | `BillingSection` shows plan badge, `analysesUsed of 3` counter, `<UpgradePrompt>` for free users. Settings page fetches live data from DB. |
| PAY-05 | 03-03 | Webhook handler for Razorpay with idempotency (x-razorpay-event-id deduplication) | ✓ SATISFIED (code) / DOC STALE | Webhook handler fully implemented with HMAC verification and `processed_webhook_events` idempotency. 8 tests pass. **REQUIREMENTS.md checkbox still shows `[ ]` (Pending) — doc not updated after implementation.** |
| PAY-06 | 03-03 | Subscription state synced to Supabase subscriptions table | ✓ SATISFIED | Webhook state machine writes to `subscriptions` table on all 4 lifecycle events (charged, halted, cancelled, completed) using service_role client |

**Note on PAY-05:** The implementation is complete and tested (8/8 webhook tests pass, idempotency logic verified in code). The REQUIREMENTS.md traceability table still shows `PAY-05 | Phase 3 | Pending` and the checkbox is `[ ]`. This is a documentation gap only — no code is missing.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `analyze/route.ts` | 45 | `console.error("Usage RPC error:", usageError)` | ℹ️ Info | Server-side logging of internal error — appropriate for observability, not a stub |
| `UpgradePrompt.tsx` | 22 | `new (window as any).Razorpay(...)` | ⚠️ Warning | `any` cast on `window` for third-party script; acceptable for Razorpay Standard Checkout which has no TypeScript types, but could be typed via `declare global` |
| `settings/page.tsx` | 48 | `(payments as { items?: unknown[] })` | ℹ️ Info | Type cast for Razorpay SDK response shape — SDK types are incomplete; cast is targeted and safe |

No blockers found. No TODO/FIXME/placeholder comments in phase-3 files. No hardcoded empty data replacing real sources. No stubs.

---

### Human Verification Required

#### 1. Razorpay Subscription Checkout (End-to-End)

**Test:** Open the analyze page as a free-tier user. Submit a profile analysis. When the UpgradePrompt appears, click "Upgrade to Pro". Complete payment with a Razorpay test card (e.g., `4111 1111 1111 1111`).
**Expected:** Razorpay popup opens with "InstaAnalyse — Pro Plan" description, payment completes, webhook fires to `/api/webhooks/razorpay`, Supabase `subscriptions` row gains `plan=pro, status=active`. Page reloads and the Settings page shows "Pro" badge.
**Why human:** Requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID`, `RAZORPAY_WEBHOOK_SECRET` in environment, Razorpay sandbox endpoint configured, live browser with `checkout.js` loaded.

#### 2. Free-Tier Usage Wall (UI state)

**Test:** Sign in as a user with `usage.analyses_used = 3` for the current billing month. Submit a fourth analysis.
**Expected:** The analyze page transitions from "loading" to "upgrade" state (not "error" state). The UpgradePrompt card renders inline showing "You've used all 3 free analyses this month" and "Unlock unlimited analyses" heading.
**Why human:** Requires a seeded Supabase test account with usage count at 3 and visual confirmation that the correct state machine branch fires.

#### 3. Webhook Idempotency (Live DB)

**Test:** Send an identical POST to `/api/webhooks/razorpay` twice with the same `x-razorpay-event-id` header and valid HMAC signature.
**Expected:** First delivery returns `200 OK`. Second delivery returns `200 Already processed`. The `processed_webhook_events` table has exactly one row for that event ID. The `subscriptions` table is not double-written.
**Why human:** Requires `RAZORPAY_WEBHOOK_SECRET` to generate a valid HMAC, and a live Supabase instance with the `processed_webhook_events` table migrated. Unit tests mock Supabase; this verifies the real UNIQUE constraint.

#### 4. Subscription Cancellation from Settings

**Test:** Sign in as a Pro user. Navigate to Settings. Click "Cancel subscription". Confirm in CancelDialog by clicking "Yes, cancel".
**Expected:** Loading state shown, then page reloads. Razorpay subscription is cancelled at cycle end. User retains Pro access until `current_period_end`. Settings page still shows "Pro" badge. Running a new analysis still works.
**Why human:** Requires a live Razorpay test subscription with a real `provider_subscription_id` in the DB, and the Razorpay sandbox to accept the cancellation call.

#### 5. PAY-05 Documentation Update (Human Action Required)

**Test:** Update `REQUIREMENTS.md` to mark PAY-05 as complete.
**Expected:** Line 56 changes from `- [ ] **PAY-05**` to `- [x] **PAY-05**`. Line 117 in the traceability table changes from `PAY-05 | Phase 3 | Pending` to `PAY-05 | Phase 3 | Complete`.
**Why human:** Documentation edit — no code change. The webhook handler is fully implemented and all 8 tests pass; the checkbox was simply not updated after implementation.

---

### Gaps Summary

No code gaps. All 4 phase goal truths are verified through artifact existence (Level 1), substantive implementation (Level 2), wiring (Level 3), and data-flow trace (Level 4). All 25 tests in the phase-3 test suite pass.

One documentation gap: PAY-05 checkbox in REQUIREMENTS.md is `[ ]` (Pending) despite the webhook handler being fully implemented and tested. This is a stale doc, not a missing feature.

All payment flows require live Razorpay sandbox testing before the phase can be marked fully confirmed. These are flagged for human verification above.

---

_Verified: 2026-03-31T16:43:00Z_
_Verifier: Claude (gsd-verifier)_
