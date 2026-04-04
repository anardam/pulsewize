---
phase: 04-ai-enhancement
plan: "04"
subsystem: api

tags: [supabase, cache, multi-agent, claude, openrouter, freemium]

# Dependency graph
requires:
  - phase: 04-ai-enhancement plan 03
    provides: runMultiAgentAnalysis orchestrator and reports table with report_type column

provides:
  - 1-hour per-user cache lookup on the analyze route (AI-06)
  - Pro/Free branch at step 7 — Pro calls runMultiAgentAnalysis, Free calls analyzeWithApi (AI-02)
  - cached:true flag in JSON response on cache hit

affects: [04-ai-enhancement, analyze-route, reports-storage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cache-before-AI: clone request body to peek username/platform, query reports table with maybeSingle, return cached:true response before hitting AI"
    - "isPro ternary at AI call site — single decision point for Pro vs Free analysis path"

key-files:
  created: []
  modified:
    - src/app/api/analyze/route.ts

key-decisions:
  - "Cache check placed after usage increment (step 2c) — usage already counted but cache saves AI cost and latency"
  - "request.clone().json() used for cache peek — preserves original body for step 3 parse"
  - "Cache lookup failure is non-fatal (empty catch) — analysis proceeds fresh if Supabase query fails"
  - "Per-user cache via RLS (auth.uid() = user_id) — no cross-user data leakage"

patterns-established:
  - "Pro/Free branch: isPro ternary at AI call site — minimal diff, single responsibility"

requirements-completed: [AI-02, AI-06]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 04 Plan 04: Cache + Pro/Free Branch Summary

**Analyze route extended with 1-hour per-user cache (Supabase maybeSingle) and Pro/Free AI branch (runMultiAgentAnalysis vs analyzeWithApi)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T10:00:00Z
- **Completed:** 2026-03-31T10:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added step 2c cache check: clones request body to read username/platform, queries reports table for same user + handle + platform within last hour, returns cached report with `cached: true` if found
- Replaced single `analyzeWithApi` call at step 7 with `isPro` ternary — Pro users get `runMultiAgentAnalysis`, free users get `analyzeWithApi`
- Imported `runMultiAgentAnalysis` from `@/lib/ai/orchestrator` — wires 04-03 orchestrator into the route

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 1-hour cache lookup and Pro/Free branch to analyze route** - `234dab5` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `src/app/api/analyze/route.ts` — Added import for runMultiAgentAnalysis, step 2c cache lookup block, and Pro/Free ternary at step 7

## Decisions Made

- Cache lookup placed at step 2c (after usage increment, before body parse) — usage is counted even on cache hit so the cached response is still "spent" correctly against the user's limit. This is consistent with the plan's intent of deduplication within a session rather than free unlimited re-analyses.
- `request.clone().json()` for body peek — original `request` body stream is preserved for the full parse at step 3.
- Empty `catch {}` on cache block — cache failure must never block analysis.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript and ESLint errors in other files (proxy.ts, test files, dashboard/page.tsx, billing components) were confirmed pre-existing and out of scope. No errors in `src/app/api/analyze/route.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Cache and Pro/Free branch wired. Analyze route now correctly routes Pro users through multi-agent orchestrator and returns cached reports within 1-hour TTL.
- Reports must be persisted to the `reports` table for cache to be effective — ensure the save-report step (if not yet implemented) stores `report_type = 'analysis'`, `platform`, and `username` fields.

## Self-Check: PASSED

- `src/app/api/analyze/route.ts` — FOUND
- `.planning/phases/04-ai-enhancement/04-04-SUMMARY.md` — FOUND
- Commit `234dab5` — FOUND

---
*Phase: 04-ai-enhancement*
*Completed: 2026-03-31*
