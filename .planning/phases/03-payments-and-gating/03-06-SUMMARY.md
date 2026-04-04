---
phase: 03-payments-and-gating
plan: "06"
subsystem: analyze-page
tags: [freemium, upgrade-prompt, razorpay, ui-wiring]
dependency_graph:
  requires: [03-02, 03-04]
  provides: [freemium-gate-visible-to-users]
  affects: [src/app/(dashboard)/analyze/page.tsx]
tech_stack:
  added: []
  patterns: [state-machine-ui, conditional-render-on-flag]
key_files:
  created: []
  modified:
    - src/app/(dashboard)/analyze/page.tsx
decisions:
  - UpgradePrompt rendered in a dedicated "upgrade" state — clean separation from "input" state prevents error text co-mingling with the upgrade card
  - Non-limitReached 429 (rate limiting) still falls through to plain error text — only data.limitReached=true triggers the upgrade state
metrics:
  duration: 2
  completed_date: "2026-03-31"
  tasks_completed: 1
  files_changed: 1
---

# Phase 3 Plan 6: Wire UpgradePrompt into Analyze Page Summary

**One-liner:** Inline UpgradePrompt on analyze page triggered by 429 + limitReached flag, completing the freemium gate UI wiring.

## What Was Built

Connected the UpgradePrompt component (Plan 04) to the analyze page state machine so free users who exhaust their 3-analysis monthly limit see the upgrade card inline instead of a plain error string.

### Changes Made

**`src/app/(dashboard)/analyze/page.tsx`**

1. Added `"upgrade"` to the `AnalyzeState` union type
2. Added `import { UpgradePrompt } from "@/components/billing/UpgradePrompt"`
3. Split the 429 handler into two branches:
   - `response.status === 429 && data.limitReached` → `setState("upgrade")` (shows UpgradePrompt)
   - `response.status === 429` without `limitReached` → `setError(...)` + `setState("input")` (plain error, unchanged behavior)
4. Added `state === "upgrade"` render block showing heading + `<UpgradePrompt />` + back button

## Verification Results

- `grep "upgrade"` — matches in AnalyzeState type, setState call, and render block
- `grep "UpgradePrompt"` — matches in import and JSX
- `grep "limitReached"` — matches in conditional handler
- `npx tsc --noEmit` — no errors in analyze/page.tsx (pre-existing razorpay module error in client.ts is out of scope)
- `npx vitest run` — 11/12 tests pass; the 1 failure is a pre-existing scraper-registry test unrelated to this change

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — UpgradePrompt is fully wired; clicking "Upgrade to Pro" calls /api/checkout and opens Razorpay popup.

## Self-Check: PASSED

- [x] `src/app/(dashboard)/analyze/page.tsx` modified with all 4 acceptance criteria
- [x] Commit `6457155` exists and staged only analyze/page.tsx
