---
phase: 03-payments-and-gating
plan: 03
subsystem: payments
tags: [razorpay, supabase, webhooks, subscriptions, api-routes, idempotency]

requires:
  - phase: 03-01
    provides: Razorpay SDK singleton (razorpay client) and RazorpayWebhookPayload type
  - phase: 03-02
    provides: subscriptions table schema and processed_webhook_events table

provides:
  - POST /api/checkout — creates Razorpay subscription for authenticated users, returns subscription_id
  - POST /api/webhooks/razorpay — verifies signature, deduplicates by event-id, updates subscriptions table
  - Subscription state machine (charged→pro/active, halted→halted/keep-pro, cancelled/completed→free)

affects: [03-04, 03-05, 03-06]

tech-stack:
  added: [vitest, @vitejs/plugin-react, jsdom, @supabase/supabase-js (worktree)]
  patterns: [TDD with vitest mocking, raw body text() for webhook signature, service_role for webhook DB writes]

key-files:
  created:
    - src/app/api/checkout/route.ts
    - src/app/api/webhooks/razorpay/route.ts
    - src/__tests__/api/checkout.test.ts
    - src/__tests__/api/webhooks-razorpay.test.ts
  modified:
    - package.json (added vitest devDependencies)

key-decisions:
  - "request.text() used before JSON.parse() in webhook handler — HMAC verified on raw bytes, not re-stringified JSON"
  - "x-razorpay-event-id used for idempotency (not payment_id per D-11 wording) — canonical per Razorpay docs"
  - "subscription.halted keeps plan=pro — grace period, do not downgrade until cancelled/completed"
  - "service_role Supabase client used in webhook route only — bypasses RLS since subscriptions table has no user UPDATE policy"

patterns-established:
  - "Pattern: Webhook raw body reading — always request.text() then JSON.parse(), never request.json()"
  - "Pattern: Idempotency via processed_webhook_events — check before processing, insert after"
  - "Pattern: State machine for subscription events — charged→pro, halted→keep-pro, cancelled/completed→free"

requirements-completed: [PAY-01, PAY-05, PAY-06]

duration: 6min
completed: 2026-03-31
---

# Phase 03 Plan 03: Checkout and Webhook Routes Summary

**Razorpay subscription checkout (POST /api/checkout) and webhook state machine (POST /api/webhooks/razorpay) with HMAC signature verification and x-razorpay-event-id idempotency**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T05:24:52Z
- **Completed:** 2026-03-31T05:31:00Z
- **Tasks:** 2
- **Files modified:** 4 created, 1 modified (package.json)

## Accomplishments

- POST /api/checkout authenticates user via Supabase, creates Razorpay subscription with notes.user_id, returns subscription_id to client
- POST /api/webhooks/razorpay verifies HMAC-SHA256 signature using Razorpay.validateWebhookSignature(), deduplicates events via x-razorpay-event-id in processed_webhook_events table
- Full subscription state machine: charged→pro/active, halted→halted/keep-pro (grace period), cancelled/completed→free/terminal
- 13 tests total (5 checkout + 8 webhook) — all passing via TDD (RED→GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 1: Checkout route — failing tests (RED)** - `f32a44f` (test)
2. **Task 1: Checkout route — implementation (GREEN)** - `310496b` (feat)
3. **Task 2: Webhook handler — failing tests (RED)** - `87f50a6` (test)
4. **Task 2: Webhook handler — implementation (GREEN)** - `140cc94` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/app/api/checkout/route.ts` - POST endpoint: auth check, razorpay.subscriptions.create with notes.user_id, returns subscriptionId
- `src/app/api/webhooks/razorpay/route.ts` - POST endpoint: raw body text(), signature verify, idempotency check, state machine, insert processed event
- `src/__tests__/api/checkout.test.ts` - 5 tests covering auth, subscription creation, notes.user_id, env var, error handling
- `src/__tests__/api/webhooks-razorpay.test.ts` - 8 tests covering signature, idempotency, all 4 subscription events, missing user_id, event recording
- `package.json` - Added vitest, @vitejs/plugin-react, jsdom as devDependencies (Rule 3 — blocking dependency)

## Decisions Made

- `request.text()` used before `JSON.parse()` in webhook handler — HMAC signature is over raw bytes; re-serializing JSON can differ from original wire bytes
- `x-razorpay-event-id` used for deduplication key (not payment_id per ambiguous D-11 wording) — this is the canonical per-delivery idempotency key in Razorpay docs
- `subscription.halted` keeps `plan=pro` (only updates `status=halted`) — halted means payment retry period, not cancellation; downgrade would incorrectly block paying users
- Service role Supabase client used in webhook route only — no user session, no RLS, subscriptions table blocks user-side writes by design

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed vitest and @vitejs/plugin-react**
- **Found during:** Task 1 (TDD RED phase — running tests)
- **Issue:** Neither the worktree nor main repo had vitest in package.json/node_modules. Tests could not run.
- **Fix:** `npm install --save-dev vitest @vitejs/plugin-react jsdom` in worktree
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx vitest run` succeeded after install
- **Committed in:** 87f50a6 (Task 2 test commit)

**2. [Rule 3 - Blocking] Installed @supabase/supabase-js in worktree**
- **Found during:** Task 2 (GREEN phase — running webhook tests)
- **Issue:** Webhook route imports `@supabase/supabase-js` (for service_role client). Package exists in main repo but wasn't in worktree node_modules.
- **Fix:** `npm install @supabase/supabase-js` in worktree
- **Files modified:** package.json, package-lock.json
- **Verification:** Tests resolved the import and all 8 webhook tests passed
- **Committed in:** 140cc94 (Task 2 feat commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking)
**Impact on plan:** Both fixes essential to unblock test execution. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in lucide-react, @supabase/ssr, and next.js type declarations across the codebase — these exist before this plan and are out of scope per deviation rules scope boundary. Logged in deferred-items.md.
- Pre-existing test failures in `scraper-registry.test.ts` and `supabase-clients.test.ts` — not caused by this plan's changes.

## User Setup Required

The following environment variables must be set:

- `RAZORPAY_PLAN_ID` — Pre-created plan ID from Razorpay dashboard (e.g., `plan_abc123`)
- `RAZORPAY_WEBHOOK_SECRET` — Webhook secret from Razorpay dashboard settings
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for webhook DB writes)
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — API credentials from Razorpay dashboard

## Known Stubs

None — both routes are fully wired. The checkout route creates real Razorpay subscriptions; the webhook route updates real Supabase rows.

## Next Phase Readiness

- Checkout route ready for UpgradePrompt component (Plan 04) to call POST /api/checkout and receive subscription_id
- Webhook route operational — Razorpay can send subscription events and subscription state will update in Supabase
- Both routes have complete test coverage; safe to rely on in downstream plans

---
*Phase: 03-payments-and-gating*
*Completed: 2026-03-31*
