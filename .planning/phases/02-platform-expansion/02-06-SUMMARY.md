---
phase: 02-platform-expansion
plan: "06"
subsystem: ui
tags: [react, nextjs, tailwind, localstorage, platform-grid, health-status]

# Dependency graph
requires:
  - phase: 02-platform-expansion
    provides: platform-health API endpoint, multi-platform scraper registry
provides:
  - PlatformCard component with health badge (ok/degraded/down/loading)
  - PlatformGrid component with 6-card responsive layout and health fetch on mount
  - 2-step analyze flow: platform selection → handle input → analysis
  - localStorage persistence of last used platform
  - Non-Instagram scraping failures show error + retry (no ManualEntryForm)
affects:
  - 02-07
  - Phase 3 payments (analyze page is the entry point gated by subscription)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PlatformCard/PlatformGrid split: card is pure presentational, grid owns data fetching
    - AnalyzeState machine extended with "platform" state as the new default entry point
    - localStorage read in useState initializer with SSR guard (typeof window)

key-files:
  created:
    - src/components/PlatformCard.tsx
    - src/components/PlatformGrid.tsx
  modified:
    - src/app/(dashboard)/analyze/page.tsx

key-decisions:
  - "analyze page now starts in platform state (not input) — users must pick a platform before entering a handle"
  - "handleBack from error/input always returns to input state (not platform) — preserves platform selection"
  - "onNewAnalysis after results returns to platform state — clean re-entry"
  - "Non-Instagram requiresManualEntry goes to error state, not manual state — per D-07"

patterns-established:
  - "Platform card components: PlatformCard is purely presentational, PlatformGrid owns fetch and state"
  - "Health map defaults to loading on init, falls back to ok on fetch failure — never blocks UI"

requirements-completed:
  - PLAT-07

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 02 Plan 06: Platform Grid UI Summary

**6-card platform selection grid with health badges wired into analyze page as a 2-step flow with localStorage platform persistence**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T03:32:03Z
- **Completed:** 2026-03-31T03:40:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created PlatformCard.tsx: clickable card with colored avatar, platform name, health badge (green/yellow/red/pulse-gray), and selected ring
- Created PlatformGrid.tsx: 6-card responsive grid (2/3/6 cols at mobile/tablet/desktop), fetches /api/platform-health on mount, defaults to ok on failure
- Rewrote analyze/page.tsx: added "platform" state as entry point, localStorage persistence via `sociallens_last_platform`, platform-scoped handleAnalyze POST, error+retry for non-Instagram scrape failures

## Task Commits

Each task was committed atomically:

1. **Task 1: PlatformCard and PlatformGrid components** - `ef6a364` (feat)
2. **Task 2: Update analyze/page.tsx with 2-step platform flow** - `1c32ef8` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified
- `src/components/PlatformCard.tsx` - Single platform card: icon circle, name, health badge, selected state ring
- `src/components/PlatformGrid.tsx` - 6-card grid with health fetch on mount; falls back to "ok" on error
- `src/app/(dashboard)/analyze/page.tsx` - 2-step state machine: platform → input → loading → results/error/manual

## Decisions Made
- analyze page now starts in `"platform"` state (not `"input"`) — users must pick a platform before entering a handle
- `handleBack` from error/input returns to `"input"` state (not `"platform"`) — preserves current platform selection within a session
- `onNewAnalysis` after results returns to `"platform"` state — allows switching platforms for next analysis
- Non-Instagram `requiresManualEntry` goes to `"error"` state with retry button — per D-07, ManualEntryForm is Instagram-only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. PlatformGrid fetches live health data from /api/platform-health on mount. All 6 platform cards render real data. The analyze flow wires the selected platform into the POST body.

## Next Phase Readiness
- Platform grid and 2-step flow complete — ready for Phase 2 Plan 07 (final integration/QA)
- /api/platform-health endpoint must return data keyed by platform id (instagram, youtube, twitter, tiktok, linkedin, facebook) for health badges to show correct status

## Self-Check: PASSED

All files present. All commits verified.

---
*Phase: 02-platform-expansion*
*Completed: 2026-03-31*
