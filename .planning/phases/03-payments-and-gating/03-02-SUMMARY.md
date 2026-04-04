---
phase: 03-payments-and-gating
plan: "02"
subsystem: payments
tags: [schema, usage-gating, subscriptions, webhook-idempotency]
dependency_graph:
  requires: []
  provides:
    - processed_webhook_events table DDL (for Plan 03 webhook handler)
    - Plan-aware usage enforcement in analyze route (Pro = unlimited, Free = 3/month)
  affects:
    - src/app/api/analyze/route.ts
    - src/lib/supabase/schema.sql
tech_stack:
  added: []
  patterns:
    - Subscription plan lookup before usage RPC call
    - isPro derived from plan + status combination (halted = grace period = still Pro)
    - UNIQUE constraint on event_id as atomic deduplication guard
key_files:
  created:
    - src/__tests__/api/analyze-plan-aware.test.ts
  modified:
    - src/lib/supabase/schema.sql
    - src/app/api/analyze/route.ts
decisions:
  - "isPro = true for halted Pro subscribers (payment grace period — keep access, do not downgrade)"
  - "usageLimit = 999999 for Pro (not Infinity) — matches INTEGER type in PostgreSQL RPC signature"
  - "limitReached: true added to 429 response — Plan 06 analyze page uses this flag to show UpgradePrompt"
  - "UNIQUE constraint on event_id is the atomic deduplication guard — no app-level SELECT then INSERT race condition"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 3
---

# Phase 3 Plan 02: Schema + Plan-Aware Analyze Route Summary

One-liner: Added `processed_webhook_events` table DDL for webhook idempotency and made the analyze route subscription-aware so Pro users pass `p_limit: 999999` while free users remain capped at 3/month.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add processed_webhook_events table to schema.sql | 01ab39c | src/lib/supabase/schema.sql |
| 2 | Update analyze route — plan-aware usage limit (PAY-03) | 13b4041 | src/app/api/analyze/route.ts, src/__tests__/api/analyze-plan-aware.test.ts |

## What Was Built

### Task 1 — processed_webhook_events DDL

Appended the `processed_webhook_events` table definition to `src/lib/supabase/schema.sql`. The table has:
- `event_id TEXT NOT NULL UNIQUE` — the x-razorpay-event-id header value; UNIQUE constraint is the atomic deduplication guard
- `event_type TEXT NOT NULL` — webhook event name
- `processed_at TIMESTAMPTZ` — timestamp for audit/TTL pruning

No RLS is needed: only the webhook handler (Plan 03) using the service_role key writes to this table.

**Manual action required:** This DDL must be applied in the Supabase Dashboard SQL Editor before the webhook handler (Plan 03) can function. Copy the block starting with `-- PROCESSED_WEBHOOK_EVENTS` from schema.sql and run it.

### Task 2 — Plan-aware analyze route

Modified `src/app/api/analyze/route.ts` to:
1. Query `subscriptions` table for the authenticated user's `plan` and `status` before calling `check_and_increment_usage()`
2. Set `isPro = true` when `plan = 'pro'` AND `status IN ('active', 'authenticated', 'halted')`
3. Pass `p_limit: usageLimit` (999999 for Pro, 3 for Free) to the RPC
4. Return `limitReached: true` in the 429 response body for client-side UpgradePrompt detection

## Tests

6 unit tests in `src/__tests__/api/analyze-plan-aware.test.ts` verify `isPro` determination:
- Pro + active → isPro true, usageLimit 999999
- Pro + halted → isPro true, usageLimit 999999 (grace period)
- Pro + cancelled → isPro false, usageLimit 3
- Free + active → isPro false, usageLimit 3
- Null subData → isPro false, usageLimit 3 (fallback)
- Pro + authenticated → isPro true, usageLimit 999999

All 6 tests pass.

## Deviations from Plan

**1. [Rule 1 - Bug] Pre-existing TSC error not fixed**
- **Found during:** Task 2 verification
- **Issue:** `src/lib/razorpay/client.ts(1,22): error TS2307: Cannot find module 'razorpay'` — pre-existing, present before this plan's changes
- **Fix:** None — out of scope. Deferred to Plan 03 which creates the webhook handler using the razorpay package.
- **Files modified:** None

**2. Pre-existing test failure in scraper-registry.test.ts**
- `getScraper > returns undefined for unsupported platform 'twitter'` — Twitter scraper was added in Phase 2 but this Phase 1 test was not updated. Pre-existing, out of scope for this plan.

## Known Stubs

None — no placeholder data introduced. All data flows from the actual subscriptions table query.

## Manual Deployment Steps

Before Plan 03 (webhook handler) can function, apply this SQL in Supabase Dashboard:

```sql
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

## Self-Check: PASSED

- src/lib/supabase/schema.sql: processed_webhook_events present — FOUND
- src/app/api/analyze/route.ts: p_limit: usageLimit, subscriptions query, limitReached — FOUND
- src/__tests__/api/analyze-plan-aware.test.ts: 6 tests all pass — FOUND
- Commit 01ab39c: schema DDL — FOUND
- Commit c9c4025: test file — FOUND
- Commit 13b4041: route implementation — FOUND
