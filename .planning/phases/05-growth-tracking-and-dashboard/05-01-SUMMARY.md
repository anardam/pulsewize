---
phase: 05-growth-tracking-and-dashboard
plan: "01"
subsystem: growth-tracking
tags: [recharts, chart-data, schema, tdd, supabase-ssr]
dependency_graph:
  requires: []
  provides:
    - recharts production dependency
    - "@supabase/ssr production dependency"
    - avatar_url column migration in schema.sql
    - report_type column migration in schema.sql
    - buildChartData() transform utility
    - ChartPoint interface
    - RED test scaffolds for reports API, profile API, and GrowthChart component
  affects:
    - src/lib/chart-data.ts
    - src/lib/supabase/schema.sql
    - package.json
    - src/__tests__/api/reports.test.ts
    - src/__tests__/api/profile.test.ts
    - src/__tests__/lib/chart-data.test.ts
    - src/__tests__/components/GrowthChart.test.tsx
tech_stack:
  added:
    - recharts ^3.8.1
    - "@supabase/ssr ^0.10.0"
  patterns:
    - TDD (RED tests scaffolded for future plans)
    - Immutable sort via .slice().sort() before map
key_files:
  created:
    - src/lib/chart-data.ts
    - src/__tests__/lib/chart-data.test.ts
    - src/__tests__/api/reports.test.ts
    - src/__tests__/api/profile.test.ts
    - src/__tests__/components/GrowthChart.test.tsx
  modified:
    - package.json
    - package-lock.json
    - src/lib/supabase/schema.sql
decisions:
  - buildChartData uses .slice().sort() to avoid mutating the input array (immutable pattern)
  - ChartPoint.date uses toLocaleDateString("en-US", { month:"short", day:"numeric" }) for short readable labels
  - GrowthChart test and API tests are pure todo stubs — route/component not yet implemented; RED state is intentional
  - report_type migration noted as backfill (Phase 4 applied it to live DB); avatar_url is new and needs manual Supabase dashboard application
metrics:
  duration: 4
  completed_date: "2026-03-31T13:16:59Z"
  tasks_completed: 2
  files_changed: 8
---

# Phase 5 Plan 01: Dependencies, Schema, and TDD Scaffolding Summary

**One-liner:** recharts + @supabase/ssr installed, schema patched with avatar_url and report_type, buildChartData utility with 10 GREEN tests, and 3 RED test scaffolds for Phase 5 API/component plans.

## What Was Built

### Task 1: Install dependencies and patch schema
- Installed `recharts@^3.8.1` and `@supabase/ssr@^0.10.0` via npm install (no peer conflict resolution needed — install succeeded cleanly)
- Appended two migration blocks to `src/lib/supabase/schema.sql`:
  - Phase 4 backfill: `ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'analysis'` with index
  - Phase 5: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT`

### Task 2: chart-data.ts utility and test files
- Created `src/lib/chart-data.ts` exporting `ChartPoint` interface and `buildChartData()` function
- `buildChartData()` takes `ReportRow[]`, sorts chronologically (immutable), maps to `ChartPoint[]` extracting: `engagement` (engagementStats.rate), `score` (profileScore.overall), `estimatedReach` (engagementStats.estimatedReach) — all default to 0 if missing
- Created `src/__tests__/lib/chart-data.test.ts` with 10 passing GREEN tests covering: empty input, shape, date format, field extraction, defaults, and sort order
- Created `src/__tests__/api/reports.test.ts` — RED scaffold (6 todos) for GET /api/reports (Plan 05-02)
- Created `src/__tests__/api/profile.test.ts` — RED scaffold (5 todos) for PATCH /api/profile (Plan 05-03)
- Created `src/__tests__/components/GrowthChart.test.tsx` — RED scaffold (4 todos) for GrowthChart component (Plan 05-06)

## Test Results

- `chart-data.test.ts`: 10 passed GREEN
- `reports.test.ts`, `profile.test.ts`, `GrowthChart.test.tsx`: all skipped (todo state) — expected RED state until respective plans implement routes/components

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — chart-data.ts is fully implemented and tested. No UI stubs or placeholder data.

## Self-Check: PASSED

- `src/lib/chart-data.ts`: FOUND
- `src/__tests__/lib/chart-data.test.ts`: FOUND
- `src/__tests__/api/reports.test.ts`: FOUND
- `src/__tests__/api/profile.test.ts`: FOUND
- `src/__tests__/components/GrowthChart.test.tsx`: FOUND
- Commit 99d5b64 (Task 1): FOUND
- Commit 2155710 (Task 2): FOUND
