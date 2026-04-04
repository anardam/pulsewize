---
phase: 02-platform-expansion
plan: "04"
subsystem: scraper-registry, prompt-builder
tags: [platform-dispatch, prompt-engineering, registry, multi-platform]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [per-platform-prompt-dispatch, full-registry]
  affects: [src/app/api/analyze/route.ts, src/lib/scrapers/registry.ts, src/lib/prompt.ts]
tech_stack:
  added: []
  patterns: [discriminated-union-dispatch, platform-switch, per-platform-prompt-builder]
key_files:
  created: []
  modified:
    - src/lib/scrapers/registry.ts
    - src/lib/prompt.ts
decisions:
  - "analyze route platform dispatch confirmed unchanged — no patch needed (platform already destructured from body with default 'instagram' and passed to getScraper)"
  - "buildAnalysisPrompt switch uses 'platform' in profileData guard to safely handle ManualProfileInput (no platform field)"
  - "Instagram prompt extracted verbatim into buildInstagramPrompt — default case — no regression"
  - "NLP and trend helpers extracted into shared buildNlpSection/buildTrendSection to avoid duplication across 6 platform builders"
  - "LinkedIn and Twitter omit content calendar by design — LinkedIn uses contentMix, Twitter is real-time and uses threadStrategy instead"
  - "Facebook hashtags kept minimal (1-3 per post) per platform norms vs Instagram (30)"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
---

# Phase 02 Plan 04: Scraper Registry + Per-Platform Prompt Wiring Summary

Registry expanded to all 6 platforms and buildAnalysisPrompt dispatches to dedicated AI prompt builders for YouTube (video growth strategist / videoSEO), Twitter (thread strategist / threadStrategy), TikTok (viral strategist / trendingAngles), LinkedIn (professional brand strategist / thoughtLeadership), and Facebook (community strategist / communityEngagement), with the original Instagram prompt preserved as-is.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | Verify analyze route + expand registry | f9126e6 | src/lib/scrapers/registry.ts |
| 2 | Per-platform prompt builders | 44133fc | src/lib/prompt.ts |

## Decisions Made

1. **analyze route — no patch needed:** All three required conditions already present (platform destructured from body, getScraper(platform) called, import from @/lib/scrapers/registry). No change required.

2. **Platform guard in buildAnalysisPrompt:** Used `"platform" in profileData` to distinguish NormalizedProfile (has platform field) from ManualProfileInput (no platform field) — defaults to "instagram" for manual entry backward compatibility.

3. **Shared NLP/trend helper functions:** Extracted `buildNlpSection()` and `buildTrendSection()` as shared private helpers to avoid copy-paste across all six platform prompt builders.

4. **Instagram prompt extracted verbatim:** Moved entire existing function body into `buildInstagramPrompt()` with no content changes — `default` case in switch calls it, ensuring zero regression.

5. **Platform-specific schema differences enforced:**
   - YouTube: `videoSEO` + `thumbnailStrategy` + `uploadStrategy.videoFormats` instead of `hashtags` as primary SEO tool
   - Twitter: `threadStrategy` section; no `contentCalendar` (real-time platform)
   - TikTok: `trendingAngles` with FYP signals, sound strategy, duet/stitch
   - LinkedIn: `thoughtLeadership` + `connectionStrategy` + `contentMix`; no hashtags, no content calendar
   - Facebook: `communityEngagement` with group/page/paid strategy; minimal hashtags (1-3)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` — exits 0
2. `grep -n "platform" src/app/api/analyze/route.ts` — confirms platform destructured and passed to getScraper(platform)
3. Registry grep — all 5 new scraper entries present
4. Switch cases grep — all 5 platform cases present in buildAnalysisPrompt
5. Platform sections grep — videoSEO, threadStrategy, trendingAngles, thoughtLeadership, communityEngagement all present
6. Function count — 12 occurrences (6 functions × 2: switch call + function definition)

## Known Stubs

None. Both registry and prompt builder are fully wired — no placeholder data, no hardcoded empty values.
