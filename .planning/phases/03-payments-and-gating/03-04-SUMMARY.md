---
phase: 03-payments-and-gating
plan: "04"
subsystem: payments
tags: [razorpay, react, next.js, checkout, subscription]

requires:
  - phase: 03-payments-and-gating
    provides: Razorpay checkout API route (/api/checkout) that returns subscriptionId

provides:
  - UpgradePrompt client component that opens Razorpay Standard Checkout popup
  - Encouraging upgrade copy ("Unlock unlimited analyses") — not punishing framing
  - Error state display when /api/checkout fails
  - Loading state during checkout initialization
  - window.location.reload() after payment callback (advisory only, no state mutation)

affects:
  - 03-06-PLAN (analyze page wiring imports UpgradePrompt)
  - 03-05-PLAN (settings billing section)

tech-stack:
  added: []
  patterns:
    - "next/script for third-party checkout.js — App Router safe, deduplicated by Next.js"
    - "Client callback advisory only — webhook is source of truth for subscription state (D-10)"
    - "subscription_id used in Razorpay options, not order_id — subscriptions require different field"

key-files:
  created:
    - src/components/billing/UpgradePrompt.tsx
  modified: []

key-decisions:
  - "handler callback reloads page only (window.location.reload) — never calls API or sets state — webhook is authoritative (D-10)"
  - "checkout.js loaded via next/script, not manual script injection — deduplication handled by Next.js"
  - "subscription_id field used (not order_id) — Razorpay subscription billing requires subscription_id"

patterns-established:
  - "UpgradePrompt: inline card (not modal/overlay) — encouraging tone per D-07"
  - "All third-party payment scripts loaded via next/script for safety and deduplication"

requirements-completed:
  - PAY-04

duration: 1min
completed: 2026-03-31
---

# Phase 03 Plan 04: UpgradePrompt Component Summary

**Razorpay Standard Checkout client component with subscription_id flow, encouraging upgrade copy, and advisory-only payment handler**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-31T05:17:05Z
- **Completed:** 2026-03-31T05:18:08Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `UpgradePrompt` client component with "Unlock unlimited analyses" heading (per D-07 encouraging tone)
- Wired to `/api/checkout` via POST fetch — receives `subscriptionId` to open Razorpay popup
- Razorpay checkout.js loaded safely via `next/script` (App Router compatible, deduplicated)
- Payment handler callback does `window.location.reload()` only — no state mutation (D-10 compliance)

## Task Commits

1. **Task 1: Create UpgradePrompt component** - `f6d16f7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/billing/UpgradePrompt.tsx` - Client component: upgrade card with Razorpay Standard Checkout popup, loading/error states, encouraging copy

## Decisions Made

- `subscription_id` used in Razorpay constructor (not `order_id`) — subscriptions require this field
- `window.location.reload()` is the only action in the payment handler — no direct state update (D-10)
- `next/script` for checkout.js ensures proper App Router deduplication

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `NEXT_PUBLIC_RAZORPAY_KEY_ID` must be set in `.env.local` (this is the public key for the checkout popup).

## Next Phase Readiness

- `UpgradePrompt` is ready to be imported by the analyze page (Plan 06)
- Component is self-contained — only dependency is `/api/checkout` HTTP endpoint (Plan 03)
- TypeScript check passes (`npx tsc --noEmit` exits 0)

## Self-Check: PASSED

- `src/components/billing/UpgradePrompt.tsx` — FOUND
- Commit `f6d16f7` — FOUND
- subscription_id present — PASS
- "Unlock unlimited analyses" copy — PASS
- window.location.reload — PASS
- "use client" directive — PASS

---
*Phase: 03-payments-and-gating*
*Completed: 2026-03-31*
