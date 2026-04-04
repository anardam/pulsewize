# Phase 2: Platform Expansion - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Twitter/X, TikTok, YouTube, LinkedIn, and Facebook scrapers to the existing scraper registry. Each platform gets a `PlatformScraper` implementation that returns `ScraperResult`. The /analyze page gets a platform card grid selector. AI prompts are customized per platform. No manual entry for new platforms — scraping failure shows error + retry.

</domain>

<decisions>
## Implementation Decisions

### Platform Selector UX
- **D-01:** Platform card grid on /analyze page — user clicks a platform card, then enters handle on the next step
- **D-02:** Remember last used platform (localStorage or Supabase user preferences)
- **D-03:** Platform health indicator on each card — if a scraper is known-down, show it before the user commits

### Scraping APIs
- **D-04:** YouTube — official YouTube Data API v3. Requires `YOUTUBE_API_KEY` env var. Free 10K units/day.
- **D-05:** Twitter/X, TikTok, LinkedIn, Facebook — Claude's discretion on best provider per platform. Research phase will determine optimal RapidAPI providers or alternatives.
- **D-06:** Each platform scraper follows the existing cascade pattern (primary → fallback → error)

### Manual Entry / Error Handling
- **D-07:** NO manual entry for new platforms. Only Instagram keeps its existing manual entry fallback.
- **D-08:** Scraping failure shows "Unable to fetch profile. Try again later." with a retry button. No form fallback.

### Profile Data Shape
- **D-09:** Claude's discretion on type strategy — unified NormalizedProfile with platform-specific extras vs per-platform types. Research will inform the best approach.
- **D-10:** AI prompts MUST be customized per platform — YouTube focuses on video strategy, Twitter on thread/engagement, TikTok on trending content, LinkedIn on professional positioning, Facebook on community engagement.

### Platform Health Monitoring
- **D-11:** Platform health indicator visible on the card grid before user starts analysis (from ROADMAP success criteria)

### Claude's Discretion
- Scraping API selection for Twitter/X, TikTok, LinkedIn, Facebook (based on research)
- NormalizedProfile type strategy (unified vs per-platform)
- Platform health check implementation (polling, canary, or on-demand)
- Scraper cascade order per platform

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, requirements, constraints
- `.planning/REQUIREMENTS.md` — PLAT-01 through PLAT-07 for this phase
- `.planning/ROADMAP.md` — Phase 2 success criteria and dependencies

### Phase 1 Foundation (built infrastructure)
- `src/lib/scrapers/types.ts` — PlatformScraper interface, ScraperResult, NormalizedProfile
- `src/lib/scrapers/registry.ts` — getScraper(), getSupportedPlatforms() — add new platforms here
- `src/lib/scrapers/instagram/index.ts` — InstagramScraper as the adapter pattern reference
- `src/lib/scrapers/instagram/cascade.ts` — Cascade logic pattern to follow for new platforms
- `src/app/api/analyze/route.ts` — Analyze route with auth + usage + registry (no changes needed if registry works)
- `src/app/(dashboard)/analyze/page.tsx` — Current analyze page (needs platform card grid)
- `src/lib/prompt.ts` — Current prompt builder (needs per-platform customization)
- `src/lib/types.ts` — InstagramProfile type (NormalizedProfile base)

### Research (project-level)
- `.planning/research/STACK.md` — API recommendations per platform
- `.planning/research/ARCHITECTURE.md` — Adapter pattern details
- `.planning/research/PITFALLS.md` — Scraping reliability concerns

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Current architecture
- `.planning/codebase/STRUCTURE.md` — Directory layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlatformScraper` interface — all new scrapers implement this exact interface
- `ScraperResult` type — standardized return shape with success/profile/error/requiresManualEntry
- `InstagramScraper` + cascade — reference implementation for the adapter pattern
- `getScraper(platform)` + registry map — just add new entries
- `ReportDashboard` component — renders analysis results (reusable across platforms)
- `LoadingScreen` component — step-by-step loading animation
- Enrichment pipeline (NLP + trends) — may need platform-aware adjustments

### Established Patterns
- Scraper cascade: primary → fallback → error (from Instagram implementation)
- API routes use `{ success, data, error }` envelope
- Registry pattern: `new Map<string, PlatformScraper>([...])`

### Integration Points
- `src/lib/scrapers/registry.ts` — register new scrapers here
- `src/lib/prompt.ts` — add platform-specific prompt templates
- `src/app/(dashboard)/analyze/page.tsx` — replace username input with platform card grid
- `.env.local` — new API keys (YOUTUBE_API_KEY, RAPIDAPI_KEY already exists)

</code_context>

<specifics>
## Specific Ideas

- Platform cards should look modern and clean (consistent with Phase 1 dark aesthetic)
- Each card should show the platform icon/logo, name, and health status
- The card grid should be responsive (2 cols mobile, 3 cols tablet, 6 cols desktop)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-platform-expansion*
*Context gathered: 2026-03-31*
