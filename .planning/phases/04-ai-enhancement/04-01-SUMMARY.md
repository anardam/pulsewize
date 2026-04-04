---
phase: 04-ai-enhancement
plan: "01"
subsystem: database, api
tags: [typescript, supabase, types, schema, ai, multi-agent]

# Dependency graph
requires:
  - phase: 03-payments-and-gating
    provides: reports table schema, Supabase infrastructure, subscriptions/usage tables
provides:
  - CalendarEntry, CalendarWeek, ContentCalendarReport types for /api/calendar
  - CompetitorMetricRow, CompetitorComparisonReport types for /api/compare
  - HashtagCategory, HashtagStrategyReport types for /api/hashtags
  - MultiAgentMetadata type extending AnalysisReport for multi-agent synthesis metadata
  - report_type column in reports table enabling filtering by report kind
affects:
  - 04-02 (multi-agent orchestration uses MultiAgentMetadata)
  - 04-03 (competitor comparison uses CompetitorComparisonReport)
  - 04-04 (content calendar uses ContentCalendarReport, CalendarEntry, CalendarWeek)
  - 04-05 (hashtag strategy uses HashtagStrategyReport, HashtagCategory)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase-namespaced type comment block: // ─── Phase 4: AI Enhancement Types ──── used to clearly mark new types in types.ts"
    - "report_type TEXT NOT NULL DEFAULT 'analysis' pattern for multi-shape JSONB reports table"
    - "Migration comment block at end of schema.sql for applying column to existing databases"

key-files:
  created:
    - src/lib/supabase/schema.sql
  modified:
    - src/lib/types.ts

key-decisions:
  - "CompetitorComparisonReport.profiles uses { username: string }[] (not NormalizedProfile) — keeps comparison type self-contained without pulling in platform-specific types; actual profile data fetched at runtime"
  - "report_type column added to CREATE TABLE (not just migration comment) — new databases get it from scratch; existing databases use the ALTER TABLE migration at end of schema.sql"
  - "MultiAgentMetadata added as optional field on AnalysisReport (not a separate type union) — additive change, all existing callsites unaffected"

patterns-established:
  - "Pattern: Append-only type additions — new interfaces added after AnalysisResponse, no existing types modified"
  - "Pattern: Schema migration comments — Phase 4 migration block at end of schema.sql documents ALTER TABLE for existing databases"

requirements-completed:
  - AI-03
  - AI-04
  - AI-05
  - AI-06

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 4 Plan 01: Type Contracts and Schema Migration Summary

**8 new TypeScript interfaces for Phase 4 AI features (calendar, comparison, hashtags, multi-agent metadata) plus report_type column migration in Supabase schema.sql**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T09:41:02Z
- **Completed:** 2026-03-31T09:43:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added 8 new exported TypeScript interfaces to src/lib/types.ts without touching existing types
- Added MultiAgentMetadata as optional field on AnalysisReport for multi-agent synthesis tracking
- Created src/lib/supabase/schema.sql with report_type column in reports table and migration comment

## Task Commits

1. **Task 1: Add new AI feature types to src/lib/types.ts** - `a271395` (feat)
2. **Task 2: Add report_type column migration to schema.sql** - `490ba8a` (feat)

## Files Created/Modified

- `src/lib/types.ts` - Added CalendarEntry, CalendarWeek, ContentCalendarReport, CompetitorMetricRow, CompetitorComparisonReport, HashtagCategory, HashtagStrategyReport, MultiAgentMetadata; added multiAgentMeta? to AnalysisReport
- `src/lib/supabase/schema.sql` - Created with full schema including report_type TEXT NOT NULL DEFAULT 'analysis' column on reports table, idx_reports_report_type index, and Phase 4 migration comment block

## New Types Added

1. **CalendarEntry** — single day content calendar cell with contentIdea, optimalPostingTime, contentType, captionDraft, hashtags, mediaSuggestion, engagementPrediction
2. **CalendarWeek** — 7-day week grid (monday-sunday) using CalendarEntry, with weekNumber
3. **ContentCalendarReport** — 4-5 week calendar report with platform, username, niche, generatedAt, weeks[]
4. **CompetitorMetricRow** — single metric row for comparison table with metric name and per-profile values array
5. **CompetitorComparisonReport** — full comparison report with metricsTable, narrative, opportunities, profiles list
6. **HashtagCategory** — single hashtag tier (niche/mid-tier/broad) with tags, reach estimate, competition level
7. **HashtagStrategyReport** — full hashtag strategy with categories[], avoidList, weeklyRotationPlan, captionMixFormula
8. **MultiAgentMetadata** — tracks which AI providers contributed, successCount, synthesized flag

## Schema Change Description

Added `report_type TEXT NOT NULL DEFAULT 'analysis'` column to the `reports` CREATE TABLE statement. Added `idx_reports_report_type` index for efficient filtering. Added migration comment block at end of file for applying to existing databases via `ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'analysis'`.

Valid report_type values: `'analysis'`, `'calendar'`, `'comparison'`, `'hashtags'`.

## Decisions Made

- CompetitorComparisonReport.profiles uses `{ username: string }[]` rather than `NormalizedProfile[]` — keeps the type self-contained; actual profile data is fetched at runtime by the comparison route
- Schema.sql was created fresh in the worktree (worktree branch was behind main) — copied full existing schema from the main project and added report_type column inline
- MultiAgentMetadata added as optional field on AnalysisReport rather than a union type — additive, zero breakage to existing callsites

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created src/lib/supabase/ directory and schema.sql from scratch**
- **Found during:** Task 2 (Add report_type column migration to schema.sql)
- **Issue:** Worktree branch (worktree-agent-ad8a61ec) was at an older commit (c7f4482) that predates the supabase directory. File referenced in plan did not exist in the worktree.
- **Fix:** Created src/lib/supabase/schema.sql using the full schema from the main project branch as base, with report_type column added inline to the reports CREATE TABLE statement.
- **Files modified:** src/lib/supabase/schema.sql (created)
- **Verification:** `grep -n "report_type" schema.sql` returns 5+ matches; all columns and tables present
- **Committed in:** 490ba8a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing file in worktree branch)
**Impact on plan:** Required deviation. Plan assumed file existed; worktree was behind. Schema created correctly from main branch content with plan-required additions.

## Issues Encountered

- Worktree branch `worktree-agent-ad8a61ec` was at commit c7f4482 (pre-Phase-2) while the main SocialLens repo is at Phase 4. The supabase directory and Phase 2/3 changes were not present. Resolved by creating the schema.sql from the main project's current schema.

## User Setup Required

None - no external service configuration required for these type/schema changes. The Phase 4 migration SQL comment in schema.sql must be run against existing Supabase databases by the user when Phase 4 is deployed.

## Next Phase Readiness

- All 8 new types are exported and available for import via `@/lib/types`
- `ContentCalendarReport` ready for 04-04 (calendar API route)
- `CompetitorComparisonReport` ready for 04-03 (comparison API route)
- `HashtagStrategyReport` ready for 04-05 (hashtags API route)
- `MultiAgentMetadata` ready for 04-02 (multi-agent orchestrator)
- Schema.sql ready for Supabase apply; migration comment ready for existing databases

## Self-Check: PASSED

- FOUND: src/lib/types.ts (28 exported interfaces, 8 new Phase 4 types)
- FOUND: src/lib/supabase/schema.sql (report_type column, index, migration comment)
- FOUND: .planning/phases/04-ai-enhancement/04-01-SUMMARY.md
- FOUND commit a271395 (Task 1: types)
- FOUND commit 490ba8a (Task 2: schema)

---
*Phase: 04-ai-enhancement*
*Completed: 2026-03-31*
