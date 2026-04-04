---
phase: 03-payments-and-gating
plan: 05
subsystem: billing-ui
tags: [billing, razorpay, settings, tdd, cancel, invoices]

# Dependency graph
requires: [03-01, 03-03]
provides:
  - BillingSection component with plan badge, usage count, payment history, upgrade/cancel
  - CancelDialog confirmation modal for subscription cancellation
  - POST /api/subscriptions/cancel route with cancelAtCycleEnd=true
  - Settings page with live billing state from DB and Razorpay
affects: [settings-page, billing-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD with vitest — RED (tests fail without route) then GREEN (all 6 pass)
    - Named exports on all billing components (established project convention)
    - Server Component fetches billing data; client components handle interactivity
    - razorpay.payments.all({ subscription_id }) for payment history (not subscriptions.fetchPayments — SDK doesn't have that method)

key-files:
  created:
    - src/components/billing/BillingSection.tsx
    - src/components/billing/CancelDialog.tsx
    - src/app/api/subscriptions/cancel/route.ts
    - src/__tests__/api/subscriptions-cancel.test.ts
  modified:
    - src/app/(dashboard)/settings/page.tsx

key-decisions:
  - "razorpay.payments.all({ subscription_id }) used instead of non-existent subscriptions.fetchPayments — SDK types confirm payments.all() is correct method"
  - "cancel route calls razorpay.subscriptions.cancel(id, true) — cancelAtCycleEnd=true means user keeps Pro until period end"
  - "Settings page remains a Server Component — only BillingSection and CancelDialog are client components"
  - "Payment fetch is non-fatal — empty invoice list shown rather than breaking the settings page"

# Metrics
duration: 4min
completed: 2026-03-31
---

# Phase 3 Plan 05: Billing UI and Cancel Subscription Summary

**BillingSection with plan badge, usage count, payment history (D-13), and self-service cancellation (D-14) wired into Settings page with Razorpay cancel route**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-31T05:36:35Z
- **Completed:** 2026-03-31T05:40:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created BillingSection client component: plan badge (Free/Pro), usage count, payment history invoice list (date/amount/status per D-13), UpgradePrompt for free users, cancel subscription button for Pro users
- Created CancelDialog client component: modal overlay with "Keep subscription" / "Yes, cancel" buttons, loading state, error display
- Created POST /api/subscriptions/cancel route: auth check (401), subscription lookup (404), plan check (400 if not pro), Razorpay cancel at cycle end (200), error handling (500)
- Written 6 TDD tests (RED then GREEN): 401, 404, 400, 200 success, cancelAtCycleEnd=true assertion, 500 on SDK throw — all pass
- Updated settings/page.tsx: fetches subscription, usage, and payment history server-side; wires BillingSection between account card and danger zone; fixes hardcoded "Free" plan badge to read from DB

## Task Commits

Each task was committed atomically:

1. **Task 1: BillingSection + CancelDialog + cancel API route (with tests)** - `938cd4a` (feat)
2. **Task 2: Wire BillingSection + payment history into Settings page** - `bf7524f` (feat)

## Files Created/Modified

- `src/components/billing/BillingSection.tsx` - Client component; exports named `BillingSection`; plan badge, usage count, invoice list, upgrade/cancel controls
- `src/components/billing/CancelDialog.tsx` - Client component; exports named `CancelDialog`; confirmation modal before cancellation
- `src/app/api/subscriptions/cancel/route.ts` - POST route; exports named `POST`; calls `razorpay.subscriptions.cancel(id, true)` for cancel at cycle end
- `src/__tests__/api/subscriptions-cancel.test.ts` - 6 vitest tests covering all cancel route cases; all pass
- `src/app/(dashboard)/settings/page.tsx` - Server component; fetches subscription/usage/payments; renders BillingSection with all props; plan badge reads from DB

## Decisions Made

- `razorpay.payments.all({ subscription_id })` used for fetching payment history — the plan referenced `subscriptions.fetchPayments` which does not exist in the Razorpay SDK types. The correct SDK method is `payments.all()` with a `subscription_id` filter, which achieves the same result.
- Settings page kept as Server Component — only the interactive billing components (BillingSection, CancelDialog) have `"use client"` directive
- Payment history fetch wrapped in try/catch — non-fatal, returns empty array on error so settings page always renders

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used correct Razorpay SDK method for payment history**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** Plan referenced `razorpay.subscriptions.fetchPayments(subscriptionId)` which does not exist in the Razorpay SDK types. TypeScript error: Property 'fetchPayments' does not exist on subscriptions
- **Fix:** Used `razorpay.payments.all({ subscription_id: subscriptionId })` which is the correct Razorpay SDK method for fetching payments filtered by subscription
- **Files modified:** `src/app/(dashboard)/settings/page.tsx`
- **Commit:** bf7524f

## Known Stubs

None — all data is wired from live sources:
- Plan, status, current_period_end, provider_subscription_id: fetched from `subscriptions` table
- analyses_used: fetched from `usage` table
- invoices: fetched from Razorpay payments API (razorpay.payments.all)

## Self-Check: PASSED

All files exist and commits verified below.
