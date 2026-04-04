---
phase: 03-payments-and-gating
plan: 01
subsystem: payments
tags: [razorpay, typescript, webhook, singleton, sdk]

# Dependency graph
requires: []
provides:
  - Razorpay SDK singleton exported as `razorpay` from src/lib/razorpay/client.ts
  - Typed webhook payload interfaces (RazorpayWebhookPayload, RazorpaySubscriptionEntity, RazorpaySubscriptionEvent)
  - REQUIREMENTS.md updated to Razorpay-only payments (PAY-02 removed, PAY-01/PAY-05 updated)
affects: [03-03, 03-06, 03-payments-and-gating]

# Tech tracking
tech-stack:
  added: [razorpay@^2.9.6]
  patterns: [server-only singleton module with env-var guard at import time]

key-files:
  created:
    - src/lib/razorpay/client.ts
    - src/lib/razorpay/types.ts
  modified:
    - .planning/REQUIREMENTS.md (PAY-02 removed, PAY-01/PAY-05 updated for Razorpay-only)
    - package.json (razorpay dependency added)

key-decisions:
  - "razorpay singleton throws at import time (not lazily) if env vars missing — catches misconfiguration early"
  - "No 'use server' directive on client.ts — it is a plain server module, not a Next.js Server Action"
  - "RazorpaySubscriptionEvent as union type, not enum — tree-shakeable, idiomatic TypeScript"

patterns-established:
  - "Server-only lib modules: import guard on env vars at module scope, named export (not default)"
  - "Typed webhook events: discriminated event union + entity interface pattern"

requirements-completed: [PAY-01]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 3 Plan 01: Razorpay SDK Singleton and Webhook Types Summary

**Razorpay SDK singleton with env-var guard at import time + typed webhook event payload shapes covering all subscription lifecycle events**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T05:20:00Z
- **Completed:** 2026-03-31T05:28:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Installed razorpay@^2.9.6 and created server-only SDK singleton at src/lib/razorpay/client.ts
- Created typed webhook payload types with full subscription lifecycle event coverage (6 event types)
- REQUIREMENTS.md corrections already applied by parallel agents; acceptance criteria confirmed satisfied

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Razorpay SDK singleton** - `44c5cdc` (feat)
2. **Task 2: Create Razorpay webhook payload types** - `a7ab6f8` (feat)
3. **Task 3: Update REQUIREMENTS.md** - pre-applied by parallel agents (no new commit needed)

## Files Created/Modified

- `src/lib/razorpay/client.ts` - Singleton Razorpay SDK instance with env-var guard; exports named `razorpay`
- `src/lib/razorpay/types.ts` - RazorpayWebhookPayload, RazorpaySubscriptionEntity, RazorpaySubscriptionEvent types
- `package.json` - razorpay@^2.9.6 added to dependencies
- `.planning/REQUIREMENTS.md` - PAY-02 removed, PAY-01 updated to Razorpay-only, PAY-05 updated to Razorpay-only

## Decisions Made

- Env-var guard at module scope (not inside function) so misconfiguration surfaces immediately on import, not at first SDK call
- `"use server"` directive intentionally omitted — this is a server-side utility module, not a Next.js Server Action
- `RazorpaySubscriptionEvent` typed as a union type rather than enum — tree-shakeable, consistent with project's TypeScript patterns

## Deviations from Plan

### Notes on Task 3

Task 3 (REQUIREMENTS.md update) was already applied by parallel agents running earlier plans (03-02, 03-04). The file on the main branch already satisfied all acceptance criteria:
- PAY-01 describes Razorpay (not Stripe)
- PAY-02 row absent from both requirements list and traceability table
- PAY-05 references Razorpay only

No additional commit was required. This is expected behavior in a parallel execution environment.

---

**Total deviations:** 0 auto-fixes required
**Impact on plan:** No scope changes. Task 3 precondition was already satisfied.

## Issues Encountered

- razorpay package was installed in the git worktree's node_modules (not the main project directory) — this is correct behavior since the worktree has its own package.json and TypeScript configuration

## User Setup Required

Add these environment variables before deploying:

```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

These are required for `src/lib/razorpay/client.ts` to import without throwing. Without them, any server route importing this module will crash at startup.

## Next Phase Readiness

- Wave 2 plans (03-03 checkout route, 03-06 webhook handler) can now import `razorpay` from `@/lib/razorpay/client` and `RazorpayWebhookPayload` from `@/lib/razorpay/types` without any missing module errors
- No blockers for Phase 3 Wave 2

---
*Phase: 03-payments-and-gating*
*Completed: 2026-03-31*
