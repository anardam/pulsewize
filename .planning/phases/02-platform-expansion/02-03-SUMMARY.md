---
phase: 02-platform-expansion
plan: "03"
subsystem: api
tags: [scraping, twitter, tiktok, linkedin, facebook, scrapecreators, zod]

# Dependency graph
requires:
  - phase: 02-platform-expansion
    plan: "01"
    provides: "NormalizedProfile discriminated union, TwitterProfile, TikTokProfile, LinkedInProfile, FacebookProfile type definitions"
provides:
  - TwitterScraper implementing PlatformScraper via ScrapeCreators /v1/twitter/profile
  - TikTokScraper implementing PlatformScraper via ScrapeCreators /v1/tiktok/profile
  - LinkedInScraper implementing PlatformScraper via ScrapeCreators /v1/linkedin/profile with URL normalization
  - FacebookScraper implementing PlatformScraper via ScrapeCreators /v1/facebook/profile with URL normalization
affects:
  - scraper registry (register all four scrapers)
  - analyze flow (platform selection, multi-platform support)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ScrapeCreators scraper pattern: validate env → fetch with 15s timeout → Zod safeParse → map to typed profile"
    - "URL normalization for LinkedIn and Facebook: handle/pagename → full https URL before API call"
    - "Thin adapter index.ts delegates to client.ts for testability"

key-files:
  created:
    - src/lib/scrapers/twitter/client.ts
    - src/lib/scrapers/twitter/index.ts
    - src/lib/scrapers/tiktok/client.ts
    - src/lib/scrapers/tiktok/index.ts
    - src/lib/scrapers/linkedin/client.ts
    - src/lib/scrapers/linkedin/index.ts
    - src/lib/scrapers/facebook/client.ts
    - src/lib/scrapers/facebook/index.ts
  modified: []

key-decisions:
  - "Each platform scraper is an independent file pair (client.ts + index.ts) — no shared base class, enables per-platform Zod schema customization"
  - "SCRAPECREATORS_BASE constant repeated per client.ts to keep files independent (no shared util coupling)"
  - "requiresManualEntry never set per D-07 — failure returns success: false, retry is the only UX option"

patterns-established:
  - "Pattern: ScrapeCreators client — const SCRAPECREATORS_BASE, Zod schema with .optional() fields, validate env → fetch → safeParse → map"
  - "Pattern: URL normalization — normalizeLinkedInInput()/normalizeFacebookInput() before encodeURIComponent — accept handle or full URL"

requirements-completed:
  - PLAT-02
  - PLAT-03
  - PLAT-04
  - PLAT-05
  - PLAT-06

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 02 Plan 03: Platform Scrapers (Twitter, TikTok, LinkedIn, Facebook) Summary

**Four ScrapeCreators-backed scrapers with Zod validation, URL normalization for LinkedIn/Facebook, and no manual entry fallback per D-07**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T02:59:21Z
- **Completed:** 2026-03-31T03:04:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Twitter and TikTok scrapers: Zod-validated ScrapeCreators API responses mapped to TwitterProfile and TikTokProfile
- LinkedIn and Facebook scrapers: handle/pagename inputs normalized to full URLs before calling ScrapeCreators API
- All four scrapers: missing SCRAPECREATORS_API_KEY returns success: false with configuration error, no requiresManualEntry set

## Task Commits

1. **Task 1: Twitter and TikTok scrapers** - `636b873` (feat)
2. **Task 2: LinkedIn and Facebook scrapers with URL normalization** - `e509c8f` (feat)

## Files Created/Modified

- `src/lib/scrapers/twitter/client.ts` - scrapeTwitterProfile() — ScrapeCreators /v1/twitter/profile with TwitterApiSchema
- `src/lib/scrapers/twitter/index.ts` - TwitterScraper class implementing PlatformScraper
- `src/lib/scrapers/tiktok/client.ts` - scrapeTikTokProfile() — ScrapeCreators /v1/tiktok/profile with TikTokApiSchema
- `src/lib/scrapers/tiktok/index.ts` - TikTokScraper class implementing PlatformScraper
- `src/lib/scrapers/linkedin/client.ts` - scrapeLinkedInProfile() with normalizeLinkedInInput() URL normalization
- `src/lib/scrapers/linkedin/index.ts` - LinkedInScraper class implementing PlatformScraper
- `src/lib/scrapers/facebook/client.ts` - scrapeFacebookProfile() with normalizeFacebookInput() URL normalization
- `src/lib/scrapers/facebook/index.ts` - FacebookScraper class implementing PlatformScraper

## Decisions Made

- SCRAPECREATORS_BASE constant repeated in each client.ts rather than extracted to a shared util — keeps files independent, avoids coupling
- All Zod schema fields are `.optional()` — third-party API responses may omit any field; defaults applied during mapping
- `requiresManualEntry` never set — per D-07, only Instagram keeps manual entry; new platforms fail with retry-only UX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**SCRAPECREATORS_API_KEY required.** Add to `.env.local`:

```
SCRAPECREATORS_API_KEY=your_key_here
```

Get your API key from the ScrapeCreators dashboard at app.scrapecreators.com under API Keys. Note: if `RAPIDAPI_KEY` was previously configured for ScrapeCreators, verify whether it works as `SCRAPECREATORS_API_KEY` first.

## Next Phase Readiness

- All four scrapers ready to register in `src/lib/scrapers/registry.ts`
- Scraper registry registration is required before the analyze route can route platform requests to these scrapers
- Platform card grid UI (analyze page 2-step flow) can now be wired to dispatch scrape requests to each platform scraper

## Self-Check: PASSED

- All 8 scraper files exist (twitter/client.ts, twitter/index.ts, tiktok/client.ts, tiktok/index.ts, linkedin/client.ts, linkedin/index.ts, facebook/client.ts, facebook/index.ts)
- Task commits verified: 636b873, e509c8f
- TypeScript compilation: 0 errors
- No requiresManualEntry in any new scraper file

---
*Phase: 02-platform-expansion*
*Completed: 2026-03-31*
