---
phase: 01-foundation
plan: "05"
subsystem: scraper-registry, analyze-api, analyze-page
tags: [scraper, registry, auth, usage-enforcement, byok-removal]
dependency_graph:
  requires: ["01-02", "01-03", "01-04"]
  provides: ["scraper-registry", "auth-gated-analyze-api", "analyze-page-state-machine"]
  affects: ["src/app/api/analyze/route.ts", "src/app/(dashboard)/analyze/page.tsx"]
tech_stack:
  added: []
  patterns: ["registry-pattern", "cascade-pattern", "server-component-layout-wrapping"]
key_files:
  created:
    - src/lib/scrapers/types.ts
    - src/lib/scrapers/registry.ts
    - src/lib/scrapers/instagram/index.ts
    - src/lib/scrapers/instagram/cascade.ts
    - src/app/(dashboard)/analyze/layout.tsx
    - src/__tests__/lib/scraper-registry.test.ts
  modified:
    - src/app/api/analyze/route.ts
    - src/app/(dashboard)/analyze/page.tsx
    - src/lib/claude-api.ts
  deleted:
    - src/lib/rate-limit.ts
    - src/components/ApiKeyModal.tsx
decisions:
  - "Server Component layout wrapping pattern used to provide TopNav to client-component analyze page without violating Next.js RSC boundaries"
  - "analyzeWithApi signature simplified to remove apiKey parameter — server uses ANTHROPIC_API_KEY env var only"
metrics:
  duration: "4 minutes"
  completed: "2026-03-31"
  tasks_completed: 2
  files_changed: 11
---

# Phase 01 Plan 05: Scraper Registry + Auth-Gated Analyze Route + BYOK Removal Summary

**One-liner:** PlatformScraper registry with InstagramScraper cascade adapter, auth+usage-gated analyze API route, wired /analyze page state machine, and BYOK removal (rate-limit.ts + ApiKeyModal.tsx deleted).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create scraper registry | aa95435 | types.ts, registry.ts, instagram/index.ts, instagram/cascade.ts, scraper-registry.test.ts |
| 2 | Update analyze route + remove BYOK + wire page | 9a51048 | route.ts, claude-api.ts, analyze/page.tsx, analyze/layout.tsx, deleted rate-limit.ts + ApiKeyModal.tsx |

## What Was Built

### Scraper Registry (src/lib/scrapers/)

- `types.ts` — `PlatformScraper` interface, `ScraperResult` type, `NormalizedProfile` type alias (= InstagramProfile for Phase 1)
- `registry.ts` — `getScraper(platform)` and `getSupportedPlatforms()` functions backed by a Map
- `instagram/index.ts` — `InstagramScraper` class implementing `PlatformScraper`, delegates to cascade
- `instagram/cascade.ts` — Wraps existing scraper files in the cascade pattern (Vercel: RapidAPI → Instagram public; Local: Puppeteer → Instaloader → RapidAPI → Instagram public)

### Updated Analyze Route

- Requires Supabase session via `createSupabaseServer().auth.getUser()` — returns 401 if unauthenticated
- Calls `check_and_increment_usage()` RPC before running analysis — returns 429 when limit reached
- Uses scraper registry via `getScraper(platform)` instead of inline cascade
- Removed: `x-api-key` header reading, `checkRateLimit()`, direct scraper imports, `analyzeProfile()` CLI fallback

### BYOK Removal

- `src/lib/rate-limit.ts` deleted
- `src/components/ApiKeyModal.tsx` deleted
- `analyzeWithApi` signature changed from `(apiKey, profileData, ...)` to `(profileData, ...)` — uses `process.env.ANTHROPIC_API_KEY` server-side only

### /analyze Page State Machine

- Client component with states: `input | loading | manual | results | error`
- `input` state: username form with error display
- `loading` state: renders `<LoadingScreen />` component
- `manual` state (422 with requiresManualEntry): renders `<ManualEntryForm />` with back handler
- `results` state: renders `<ReportDashboard />` with "Run again" callback
- `error` state: falls back to input state with error message
- 401 response redirects to `/login`
- 429 response shows inline usage-limit error in input state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Server Component boundary violation — TopNav in client component**
- **Found during:** Task 2 — build error on first compile attempt
- **Issue:** Plan specified `<TopNav activePath="/analyze" />` inside the client `AnalyzePage` component. `TopNav` is an async Server Component that calls `createSupabaseServer()` which uses `next/headers` — this cannot be imported in a client component bundle
- **Fix:** Created `src/app/(dashboard)/analyze/layout.tsx` as a Server Component that renders `<TopNav>` and wraps `{children}`. The client `page.tsx` only renders the content area
- **Files modified:** `src/app/(dashboard)/analyze/layout.tsx` (created), `src/app/(dashboard)/analyze/page.tsx` (TopNav import removed)
- **Commit:** 9a51048

## Known Stubs

None — all functionality is wired. The analyze flow is end-to-end functional (pending valid Supabase + Anthropic API keys in environment).

## Self-Check: PASSED

All created files exist on disk. Both task commits (aa95435, 9a51048) are present in git history.
