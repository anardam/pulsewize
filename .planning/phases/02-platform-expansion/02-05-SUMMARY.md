---
phase: 02-platform-expansion
plan: "05"
subsystem: infra
tags: [supabase, vercel-cron, platform-health, monitoring, canary]

requires:
  - phase: 02-01
    provides: scraper registry and NormalizedProfile types used to identify platforms

provides:
  - platform_health Supabase table migration SQL
  - getPlatformHealth() library function with graceful fallback
  - GET /api/platform-health endpoint (no auth, returns all 6 platforms)
  - GET /api/cron/platform-health endpoint (CRON_SECRET protected, canary checks + upserts)
  - vercel.json with 15-minute cron schedule

affects:
  - UI platform cards (D-03 health indicator badges)
  - Phase 02 scraper plans (health state reflects scraper API availability)

tech-stack:
  added: []
  patterns:
    - "Vercel Cron + CRON_SECRET auth pattern for background jobs"
    - "Graceful Supabase fallback — non-blocking health check, defaults all platforms to ok"
    - "Canary handles (known stable public profiles) per platform for lightweight probing"

key-files:
  created:
    - src/lib/platform-health.ts
    - src/app/api/platform-health/route.ts
    - src/app/api/cron/platform-health/route.ts
    - vercel.json
    - supabase/migrations/20260331_platform_health.sql
  modified: []

key-decisions:
  - "Cron route uses Authorization: Bearer {CRON_SECRET} — Vercel sends this automatically when CRON_SECRET env var is set"
  - "getPlatformHealth() uses SUPABASE_SERVICE_ROLE_KEY (not anon key) for server-side read — no user session required"
  - "Instagram health defaults to ok (no dedicated canary) — existing scraper chain handles it; no separate API probe needed"
  - "Health endpoint returns 200 with all 6 platforms defaulting to ok when Supabase is unreachable — non-blocking UX"

patterns-established:
  - "Platform health: always return all 6 platforms, never partial map"
  - "Cron auth: CRON_SECRET checked before any DB or external API calls"
  - "noKey() helper for missing API key cases — keeps Promise.all uniform"

requirements-completed:
  - PLAT-07

duration: 2min
completed: 2026-03-31
---

# Phase 02 Plan 05: Platform Health Monitoring Summary

**Supabase platform_health table + Vercel Cron canary checks + public GET endpoint, all 6 platforms default to ok when unreachable**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T02:59:10Z
- **Completed:** 2026-03-31T03:00:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Supabase migration SQL for platform_health table with status constraint (ok/degraded/down)
- getPlatformHealth() library with graceful fallback — never blocks users if Supabase is unreachable
- GET /api/platform-health returns all 6 platforms (no auth, force-dynamic)
- GET /api/cron/platform-health validates CRON_SECRET, runs canary probes, upserts results to Supabase
- vercel.json created with */15 * * * * cron schedule

## Task Commits

1. **Task 1: Supabase migration + platform-health library** - `cf20f40` (feat)
2. **Task 2: Platform health GET endpoint and Vercel Cron route** - `841f00c` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/lib/platform-health.ts` - getPlatformHealth() reads Supabase, exports PlatformStatus + PlatformHealthMap
- `src/app/api/platform-health/route.ts` - Public GET endpoint, force-dynamic, returns { success, data }
- `src/app/api/cron/platform-health/route.ts` - Cron GET endpoint, CRON_SECRET auth, canary checks, Supabase upsert
- `vercel.json` - Cron configuration for 15-minute platform health canary
- `supabase/migrations/20260331_platform_health.sql` - DDL for platform_health table

## Decisions Made

- CRON_SECRET used for cron route authorization — Vercel injects this header automatically
- Service role key for Supabase writes in cron — bypasses RLS (no user session in cron context)
- Instagram treated as "ok" by default in canary — its scraper chain is existing and tested separately
- getPlatformHealth() catches all Supabase errors silently — user experience must never break due to health check failure

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

All 5 created files verified present. Both task commits (cf20f40, 841f00c) verified in git log.

## Issues Encountered

None.

## User Setup Required

The following environment variables must be set in Vercel dashboard:

- `CRON_SECRET` — arbitrary secret string; Vercel will pass it as `Authorization: Bearer {CRON_SECRET}` to cron routes
- `SUPABASE_SERVICE_ROLE_KEY` — service role key from Supabase project settings (required for cron writes)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (already required by auth)
- `SCRAPECREATORS_API_KEY` — required for Twitter, TikTok, LinkedIn, Facebook canary checks
- `YOUTUBE_API_KEY` — required for YouTube canary checks

The Supabase migration SQL must be executed manually:
- File: `supabase/migrations/20260331_platform_health.sql`
- Either run via `npx supabase db push` (if Supabase CLI configured) or paste into the Supabase SQL editor

## Next Phase Readiness

- Health infrastructure is complete and non-blocking — UI can call GET /api/platform-health to show status badges
- Cron will start running on Vercel once CRON_SECRET is configured and the app is deployed
- Remaining platform scrapers (Twitter, TikTok, YouTube, LinkedIn, Facebook) in wave 2 will automatically feed into the cron canary checks once SCRAPECREATORS_API_KEY and YOUTUBE_API_KEY are available

---
*Phase: 02-platform-expansion*
*Completed: 2026-03-31*
