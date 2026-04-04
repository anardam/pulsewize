---
phase: "04-ai-enhancement"
plan: "05"
subsystem: "api-routes, prompt-builders"
tags: ["ai", "competitor-comparison", "content-calendar", "hashtag-strategy", "api"]
dependency_graph:
  requires: ["04-01", "04-03"]
  provides: ["compare-endpoint", "calendar-endpoint", "hashtags-endpoint"]
  affects: ["frontend-premium-features"]
tech_stack:
  added: []
  patterns: ["OpenRouter AI generation", "parallel scraping with Promise.allSettled", "JSON brace-stripping parser"]
key_files:
  created:
    - src/app/api/compare/route.ts
    - src/app/api/calendar/route.ts
    - src/app/api/hashtags/route.ts
  modified:
    - src/lib/prompt.ts
decisions:
  - "Compare route re-scrapes profiles via Promise.allSettled — parallel, partial failures non-fatal"
  - "Calendar and hashtags accept optional analysisReport to avoid re-scraping when caller already has data"
  - "JSON extraction uses brace-stripping pattern — consistent with existing analyze route"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_changed: 4
---

# Phase 4 Plan 05: New AI Feature Routes Summary

3 authenticated API routes (compare, calendar, hashtags) and 3 prompt builders added to deliver competitor comparison (AI-03), content calendar (AI-04), and hashtag strategy (AI-05) premium features.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add buildComparePrompt, buildCalendarPrompt, buildHashtagPrompt to prompt.ts | 5e6c354 |
| 2 | Create /api/compare, /api/calendar, /api/hashtags routes | 046ec35 |

## Routes Created

### POST /api/compare
- **Request:** `{ platform: string, usernames: string[] }` (2-3 usernames)
- **Response:** `{ success: true, report: CompetitorComparisonReport }`
- **Auth:** Supabase session required (401 if unauthenticated)
- **Behavior:** Re-scrapes all profiles in parallel via `Promise.allSettled` — requires at least 2 successful scrapes. Returns metrics table (7 metrics), narrative, and differentiation opportunities.

### POST /api/calendar
- **Request:** `{ platform: string, username: string, analysisReport?: object }`
- **Response:** `{ success: true, report: ContentCalendarReport }`
- **Auth:** Supabase session required (401 if unauthenticated)
- **Behavior:** If `analysisReport` provided, uses it as profile context without re-scraping. Otherwise scrapes fresh. Returns 4 CalendarWeek objects (28 days) with content ideas, posting times, caption drafts, and hashtags.

### POST /api/hashtags
- **Request:** `{ platform: string, username: string, analysisReport?: object }`
- **Response:** `{ success: true, report: HashtagStrategyReport }`
- **Auth:** Supabase session required (401 if unauthenticated)
- **Behavior:** Same scrape/analysisReport logic as calendar. Returns 4 hashtag categories (ultra-niche, niche, mid-tier, broad), avoid list, weekly rotation plan, and caption mix formula.

## Prompt Builders Added

All 3 builders appended to the end of `src/lib/prompt.ts`:

- **`buildComparePrompt(profiles: NormalizedProfile[], platform: string): string`** — Side-by-side competitor analysis with 7-metric table, 3-4 paragraph narrative, 3-5 differentiation opportunities
- **`buildCalendarPrompt(profile: NormalizedProfile | ManualProfileInput, platform: string): string`** — 30-day content calendar with 4 weeks × 7 days, each with contentIdea, optimalPostingTime, contentType, captionDraft (100-150 chars), 5-8 hashtags, mediaSuggestion, engagementPrediction
- **`buildHashtagPrompt(profile: NormalizedProfile | ManualProfileInput, platform: string): string`** — Hashtag strategy with 4 categories (8-10 tags each), avoid list, weekly rotation plan, caption mix formula

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all routes use live scraping and real AI generation via OpenRouter.

## Self-Check: PASSED

- [x] src/app/api/compare/route.ts exists
- [x] src/app/api/calendar/route.ts exists
- [x] src/app/api/hashtags/route.ts exists
- [x] src/lib/prompt.ts has all 3 new exported builders
- [x] 5e6c354 commit exists
- [x] 046ec35 commit exists
