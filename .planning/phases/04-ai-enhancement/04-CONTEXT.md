# Phase 4: AI Enhancement - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add multi-provider AI debate (Claude + ChatGPT + Gemini) for Pro users, single-agent for free users, competitor comparison (2-3 profiles side-by-side), AI content calendar (30-day weekly grid), hashtag strategy recommendations, and 1-hour result caching. All analysis features work across all 6 platforms.

</domain>

<decisions>
## Implementation Decisions

### Multi-Agent Debate System
- **D-01:** Three AI providers: Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google) — genuinely diverse perspectives
- **D-02:** All 3 agents analyze the same profile data in parallel (Promise.all)
- **D-03:** Single synthesized report presented to user — not tabs or expandable per-agent sections. One cohesive report weaving all 3 perspectives.
- **D-04:** Best performer determination: Claude's discretion (research will inform — scoring by completeness, section coverage, or always Claude as synthesizer)
- **D-05:** Free users get single-agent analysis (Claude only). Pro users get multi-agent debate.
- **D-06:** Use OpenRouter as unified API gateway — single OPENROUTER_API_KEY routes to Claude, GPT-4o-mini, and Gemini Flash. OpenAI-compatible SDK. Replaces 3 separate API keys with 1. Existing ANTHROPIC_API_KEY stays for single-agent (free tier) to avoid OpenRouter markup on free users.

### Competitor Comparison
- **D-07:** Phase 4 implements handle-input entry point only. The "select from saved reports" path is deferred to Phase 5 (depends on GROW-01 saved reports feature). Phase 5 will add a "compare from history" option to CompetitorComparison.
- **D-08:** Report format: side-by-side metrics comparison table at top, then AI narrative analyzing differences and opportunities
- **D-09:** Same platform only — no cross-platform comparison (e.g., can't compare an Instagram profile with a YouTube channel)

### Content Calendar
- **D-10:** Weekly grid view — 7 columns (Mon-Sun), 4-5 rows (weeks), each cell has content entry
- **D-11:** Full detail per entry: content idea, optimal posting time, content type (reel/story/tweet/video), caption draft, hashtags, media suggestions, engagement prediction
- **D-12:** 30-day calendar generated from the analyzed profile's niche, audience, and platform

### Hashtag Strategy
- **D-13:** Hashtag recommendations identify niche tags vs oversaturated tags — help user find the sweet spot
- **D-14:** Tied to the per-platform prompt system (already exists in prompt.ts from Phase 2)

### Caching
- **D-15:** Cache in Supabase `reports` table — query by platform + handle + timestamp within 1 hour before re-analyzing
- **D-16:** No separate cache service — Supabase is sufficient

### Claude's Discretion
- Best performer selection algorithm for synthesis
- OpenAI and Google AI model selection (GPT-4o-mini vs GPT-4o, Gemini 2.0 Flash vs Pro)
- How to structure the synthesis prompt (feed all 3 reports + ask for unified report)
- Content calendar JSON schema for AI output
- Hashtag strategy format (categories, usage recommendations)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, validated requirements
- `.planning/REQUIREMENTS.md` — AI-01 through AI-06 for this phase
- `.planning/ROADMAP.md` — Phase 4 success criteria

### Phase 3 Context (forward decisions)
- `.planning/phases/03-payments-and-gating/03-CONTEXT.md` — D-15, D-16, D-17 (multi-provider AI decision)

### Existing AI Infrastructure
- `src/lib/claude-api.ts` — Current Claude analysis (extend, don't replace)
- `src/lib/prompt.ts` — Per-platform prompt builders (Phase 2) — extend for multi-agent
- `src/app/api/analyze/route.ts` — Analyze route (add multi-agent orchestration for Pro users)
- `src/lib/scrapers/types.ts` — NormalizedProfile discriminated union
- `src/components/ReportDashboard.tsx` — Report renderer (extend for comparison + calendar views)

### Existing Subscription Infrastructure
- `src/app/api/analyze/route.ts` — Already checks subscription plan (Pro vs Free)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `claude-api.ts` — analyzeWithApi() already works, becomes one of 3 providers
- `prompt.ts` — buildAnalysisPrompt() with per-platform switch — same prompt goes to all 3 providers
- `ReportDashboard.tsx` — Renders analysis reports, needs extension for comparison + calendar
- Subscription check in analyze route — already distinguishes Pro vs Free

### Established Patterns
- API routes with { success, data, error } envelope
- Supabase RPC for atomic operations
- NormalizedProfile discriminated union across platforms

### Integration Points
- `src/lib/claude-api.ts` — Keep as Claude provider, add OpenAI + Gemini providers alongside
- `src/app/api/analyze/route.ts` — Orchestrate multi-agent for Pro, single for Free
- `src/app/api/compare/route.ts` — New endpoint for competitor comparison
- `src/app/api/calendar/route.ts` — New endpoint for content calendar
- `src/app/api/hashtags/route.ts` — New endpoint for hashtag strategy
- `src/lib/supabase/schema.sql` — reports table used for caching

</code_context>

<specifics>
## Specific Ideas

- Multi-agent synthesis should feel seamless — user shouldn't know 3 providers contributed unless they look at the report metadata
- Competitor comparison table should use the gradient accent for the "leader" in each metric
- Content calendar should be exportable (copy to clipboard or download)
- Hashtag recommendations should show estimated reach/competition level

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-ai-enhancement*
*Context gathered: 2026-03-31*
