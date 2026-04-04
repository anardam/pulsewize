# Phase 4: AI Enhancement - Research

**Researched:** 2026-03-31
**Domain:** Multi-provider AI orchestration, OpenRouter API, content calendar generation, competitor comparison, Supabase caching
**Confidence:** HIGH

## Summary

Phase 4 extends the existing single-agent Claude analysis into a multi-provider AI debate system using OpenRouter as a unified gateway. Free users get the existing single-agent Claude path (unchanged); Pro users get three parallel AI analyses that synthesize into one report. The existing `analyzeWithApi` function in `claude-api.ts` becomes one of three provider functions — the prompt system in `prompt.ts` is already platform-aware and reusable across all three providers without modification.

The `openai` npm package (v6.33.0) is already installed as a transitive dependency. OpenRouter is fully OpenAI SDK-compatible: set `baseURL` to `https://openrouter.ai/api/v1` and pass `OPENROUTER_API_KEY`. Model IDs follow `provider/model-name` format. The `@openrouter/sdk` native SDK is available but unnecessary — the project already has `openai` installed, and the OpenAI SDK path is the correct choice for drop-in compatibility with minimum new dependencies.

The Supabase `reports` table already has `platform`, `username`, and `created_at` columns — the 1-hour dedup cache query is a simple `.gt('created_at', oneHourAgo.toISOString())` filter. No schema changes are needed for caching. New types are needed for: multi-agent synthesis metadata, content calendar grid, competitor comparison, and hashtag strategy responses.

**Primary recommendation:** Build three thin provider wrappers (`analyzeWithClaude`, `analyzeWithGpt`, `analyzeWithGemini`) that all call the same `buildAnalysisPrompt()` and return `AnalysisReport`. Orchestrate with `Promise.all` in the analyze route. Feed all three reports into a synthesis prompt that returns the final unified `AnalysisReport`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Three AI providers: Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google)
- **D-02:** All 3 agents analyze the same profile data in parallel (Promise.all)
- **D-03:** Single synthesized report presented to user — not tabs or expandable per-agent sections. One cohesive report weaving all 3 perspectives.
- **D-04:** Best performer determination: Claude's discretion (research will inform — scoring by completeness, section coverage, or always Claude as synthesizer)
- **D-05:** Free users get single-agent analysis (Claude only). Pro users get multi-agent debate.
- **D-06:** Use OpenRouter as unified API gateway — single OPENROUTER_API_KEY routes to Claude, GPT-4o-mini, and Gemini Flash. OpenAI-compatible SDK. Replaces 3 separate API keys with 1. Existing ANTHROPIC_API_KEY stays for single-agent (free tier) to avoid OpenRouter markup on free users.
- **D-07:** Two entry points for competitor comparison: enter 2-3 new handles on same platform, OR select from previously saved reports.
- **D-08:** Report format: side-by-side metrics comparison table at top, then AI narrative analyzing differences and opportunities.
- **D-09:** Same platform only — no cross-platform comparison.
- **D-10:** Weekly grid view — 7 columns (Mon-Sun), 4-5 rows (weeks), each cell has content entry.
- **D-11:** Full detail per entry: content idea, optimal posting time, content type, caption draft, hashtags, media suggestions, engagement prediction.
- **D-12:** 30-day calendar generated from the analyzed profile's niche, audience, and platform.
- **D-13:** Hashtag recommendations identify niche tags vs oversaturated tags.
- **D-14:** Tied to the per-platform prompt system.
- **D-15:** Cache in Supabase `reports` table — query by platform + handle + timestamp within 1 hour before re-analyzing.
- **D-16:** No separate cache service — Supabase is sufficient.

### Claude's Discretion
- Best performer selection algorithm for synthesis
- OpenAI and Google AI model selection (GPT-4o-mini vs GPT-4o, Gemini 2.0 Flash vs Pro)
- How to structure the synthesis prompt (feed all 3 reports + ask for unified report)
- Content calendar JSON schema for AI output
- Hashtag strategy format (categories, usage recommendations)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | Multi-agent debate analysis — 3 AI agents independently analyze a profile, then synthesize diverse perspectives into one richer report | OpenRouter API model IDs confirmed; Promise.all orchestration pattern; synthesis prompt design documented |
| AI-02 | Single-agent analysis remains available for free-tier users | Existing `analyzeWithApi` in `claude-api.ts` keeps using `ANTHROPIC_API_KEY` — no OpenRouter markup; route already checks `isPro` |
| AI-03 | Competitor comparison — side-by-side analysis of 2-3 profiles on same platform | New `/api/compare` route; profiles fetched via existing scraper registry; comparison prompt design documented |
| AI-04 | AI-generated content calendar with optimal posting times and content ideas per platform | New `/api/calendar` route; weekly grid JSON schema designed; per-platform prompt extension documented |
| AI-05 | Hashtag strategy recommendations based on niche, trends, and engagement data | New `/api/hashtags` route; 3-tier categorization schema (niche/mid/broad) already exists in AnalysisReport; enhanced strategy format designed |
| AI-06 | AI cost controls — use Haiku for worker agents, token caps, result caching for same-handle analyses | claude-3.5-haiku for workers ($0.80/1M in, $4/1M out); Gemini 2.0 Flash cheapest at $0.10/$0.40; Supabase cache query pattern documented |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | 6.33.0 (already installed) | OpenAI-SDK-compatible HTTP client for OpenRouter calls | Already in node_modules as transitive dep; OpenRouter is fully compatible; no new installs needed |
| @anthropic-ai/sdk | ^0.80.0 (already installed) | Direct Anthropic API for free-tier single-agent path | Already installed; avoids OpenRouter markup on free users (D-06) |
| @supabase/supabase-js | already installed | Cache lookup and report persistence | Already installed; reports table already has needed columns |

### OpenRouter Model IDs (verified from openrouter.ai)

| Provider | Model ID | Cost (input/output per 1M tokens) | Use Case |
|----------|----------|----------------------------------|----------|
| Anthropic | `anthropic/claude-3.5-haiku` | $0.80 / $4.00 | Worker agent — fast, cheap (AI-06 cost control) |
| Anthropic | `anthropic/claude-sonnet-4` | $3.00 / $15.00 | Synthesis step only (higher quality reasoning) |
| OpenAI | `openai/gpt-4o-mini` | ~$0.15 / $0.60 | Worker agent — cheap, good at following JSON schemas |
| Google | `google/gemini-2.0-flash-001` | $0.10 / $0.40 | Worker agent — cheapest option, fast |

**Cost recommendation (Claude's discretion):** Use `claude-3.5-haiku`, `openai/gpt-4o-mini`, and `google/gemini-2.0-flash-001` for the three worker agents. Use `anthropic/claude-sonnet-4` for the synthesis step (one call after 3 worker calls). Per analysis: ~3 × 8192 output tokens × avg $1.50/1M = ~$0.04 for workers, plus ~1 × 4096 synthesis = ~$0.06 total per Pro analysis. Acceptable for gated Pro feature.

### No New Packages Required

The `openai` package is already in `node_modules` (v6.33.0). Confirm in package.json it's present — if it's only a transitive dep, add it explicitly:

```bash
npm install openai
```

**Version verification:** `npm view openai version` → 6.33.0 confirmed at research time (2026-03-31).

## Architecture Patterns

### OpenRouter Client Initialization

```typescript
// Source: https://openrouter.ai/docs/quickstart (verified 2026-03-31)
// src/lib/openrouter-client.ts
import OpenAI from "openai";

export function createOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://instaanalyse.com",
      "X-Title": "InstaAnalyse",
    },
  });
}
```

### Recommended Project Structure

```
src/lib/
├── ai/
│   ├── providers/
│   │   ├── claude.ts          # analyzeWithClaude() — wraps existing claude-api.ts logic
│   │   ├── openai.ts          # analyzeWithGpt() — OpenRouter via openai SDK
│   │   └── gemini.ts          # analyzeWithGemini() — OpenRouter via openai SDK
│   ├── orchestrator.ts        # runMultiAgentAnalysis() — Promise.all + synthesis
│   ├── synthesizer.ts         # synthesizeReports() — takes 3 AnalysisReports → 1
│   └── openrouter-client.ts   # shared OpenRouter client factory
src/app/api/
├── analyze/route.ts           # EXTEND: branch free→claude-direct, pro→orchestrator
├── compare/route.ts           # NEW: competitor comparison
├── calendar/route.ts          # NEW: 30-day content calendar
└── hashtags/route.ts          # NEW: enhanced hashtag strategy
src/lib/
├── prompt.ts                  # EXTEND: add buildCalendarPrompt(), buildHashtagPrompt(), buildComparePrompt()
├── types.ts                   # EXTEND: add new response types
```

### Pattern 1: Multi-Agent Parallel + Synthesis

**What:** Three provider functions called simultaneously via `Promise.all`. Results fed into a synthesis call that produces the final unified `AnalysisReport`.

**When to use:** Pro users only (`isPro === true`). Free users bypass to existing `analyzeWithApi()`.

**Example:**
```typescript
// Source: architecture pattern derived from existing analyze route + OpenRouter docs
// src/lib/ai/orchestrator.ts

export async function runMultiAgentAnalysis(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): Promise<{ success: boolean; report?: AnalysisReport; error?: string }> {
  const prompt = buildAnalysisPrompt(profileData, nlpResult, trendResult);

  // Worker agents run in parallel — all use same prompt, different providers
  const [claudeResult, gptResult, geminiResult] = await Promise.allSettled([
    analyzeWithClaude(prompt),   // anthropic/claude-3.5-haiku via OpenRouter
    analyzeWithGpt(prompt),      // openai/gpt-4o-mini via OpenRouter
    analyzeWithGemini(prompt),   // google/gemini-2.0-flash-001 via OpenRouter
  ]);

  // Collect successful results — partial success is acceptable
  const successfulReports = [claudeResult, gptResult, geminiResult]
    .filter((r): r is PromiseFulfilledResult<AnalysisReport> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);

  if (successfulReports.length === 0) {
    return { success: false, error: "All AI providers failed" };
  }

  // If only 1 succeeded, return it directly without synthesis overhead
  if (successfulReports.length === 1) {
    return { success: true, report: successfulReports[0] };
  }

  // Synthesis: feed all reports to Claude Sonnet for unified report
  return synthesizeReports(successfulReports, profileData);
}
```

**Key insight:** `Promise.allSettled` (not `Promise.all`) prevents one failing provider from killing the whole request. Partial success (2/3 agents) still produces a quality synthesis.

### Pattern 2: OpenRouter Provider Wrapper

**What:** Thin wrapper that calls OpenRouter via OpenAI SDK, parses JSON from response, and returns `AnalysisReport`. All three providers use this same shape.

**Example:**
```typescript
// Source: https://openrouter.ai/anthropic/claude-3.5-haiku/api (verified 2026-03-31)
// src/lib/ai/providers/openai.ts

import OpenAI from "openai";
import { createOpenRouterClient } from "../openrouter-client";
import { AnalysisReport } from "@/lib/types";

export async function analyzeWithGpt(
  prompt: string
): Promise<AnalysisReport | null> {
  const client = createOpenRouterClient();

  try {
    const completion = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return parseAnalysisJson(text); // shared JSON extraction utility
  } catch {
    return null;
  }
}
```

### Pattern 3: Synthesis Prompt

**What:** After collecting 2-3 worker reports, Claude Sonnet synthesizes them into a single best-of-all report.

**Synthesis prompt structure:**
```
You are a senior social media strategist synthesizing 3 independent AI analyses of the same profile.
Each analysis was produced independently. Your task is to produce ONE unified report that:
1. Takes the highest-quality, most specific recommendations from each
2. Resolves any contradictions by preferring the most data-grounded view
3. Ensures every section is fully populated (never leave a section empty)
4. Returns valid JSON matching the exact AnalysisReport schema

REPORT 1 (Claude):
[JSON]

REPORT 2 (GPT-4o-mini):
[JSON]

REPORT 3 (Gemini Flash):
[JSON]

Return ONLY the synthesized JSON, no markdown fences.
```

**Model for synthesis:** `anthropic/claude-sonnet-4` via OpenRouter (best reasoning, trusted synthesizer).

### Pattern 4: Supabase 1-Hour Cache Lookup

**What:** Before running analysis, check if a fresh report for this platform+handle already exists in Supabase `reports` table.

**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/filter (verified)
// In analyze route, before scraping

const oneHourAgo = new Date();
oneHourAgo.setHours(oneHourAgo.getHours() - 1);

const { data: cachedReport } = await supabase
  .from("reports")
  .select("report_data, analyzed_at")
  .eq("platform", platform)
  .eq("username", username.toLowerCase())
  .gt("created_at", oneHourAgo.toISOString())
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

if (cachedReport) {
  return NextResponse.json({
    success: true,
    report: cachedReport.report_data,
    cached: true,
  });
}
```

**Important:** The `reports` table RLS policy only allows `auth.uid() = user_id` reads. For cache lookup, use the server-side Supabase client (service role or auth'd user client). The cache lookup must happen AFTER user authentication to respect RLS — or use `SECURITY DEFINER` RPC for cross-user cache hits. **Recommendation:** Use the authenticated user's Supabase client for lookup (user sees their own cached report, not others'). This is simpler and avoids cross-user data sharing concerns.

### Pattern 5: Content Calendar New Type

**What:** The existing `ContentCalendarDay` in `types.ts` is a 7-day linear array. The new 30-day weekly grid requires a richer type.

**New types to add:**
```typescript
// src/lib/types.ts — extend with new types

export interface CalendarEntry {
  contentIdea: string;
  optimalPostingTime: string;      // e.g. "7:00 PM EST"
  contentType: "reel" | "story" | "tweet" | "video" | "carousel" | "post";
  captionDraft: string;
  hashtags: string[];              // 5-10 tags
  mediaSuggestion: string;         // e.g. "vertical video, natural lighting, 15-30s"
  engagementPrediction: string;    // e.g. "High — trending format for fitness niche"
}

export interface CalendarWeek {
  weekNumber: number;              // 1-4 or 1-5
  monday: CalendarEntry;
  tuesday: CalendarEntry;
  wednesday: CalendarEntry;
  thursday: CalendarEntry;
  friday: CalendarEntry;
  saturday: CalendarEntry;
  sunday: CalendarEntry;
}

export interface ContentCalendarReport {
  platform: string;
  username: string;
  niche: string;
  generatedAt: string;
  weeks: CalendarWeek[];           // 4-5 weeks = 30 days
}
```

### Pattern 6: Competitor Comparison Types

```typescript
// src/lib/types.ts — extend

export interface CompetitorMetricRow {
  metric: string;                  // "Followers", "Engagement Rate", etc.
  values: { username: string; value: string | number; isLeader: boolean }[];
}

export interface CompetitorComparisonReport {
  platform: string;
  analyzedAt: string;
  profiles: { username: string; profile: NormalizedProfile }[];
  metricsTable: CompetitorMetricRow[];
  narrative: string;               // AI narrative paragraph(s)
  opportunities: string[];         // Top 3-5 differentiation opportunities
}
```

### Pattern 7: Enhanced Hashtag Strategy Type

```typescript
// src/lib/types.ts — extend

export interface HashtagCategory {
  name: string;                    // e.g. "Ultra-niche (under 100K posts)"
  tags: string[];
  estimatedReach: string;          // e.g. "5K-50K per post"
  competitionLevel: "low" | "medium" | "high";
  recommendation: string;          // e.g. "Use 5-8 of these per post"
}

export interface HashtagStrategyReport {
  platform: string;
  username: string;
  niche: string;
  generatedAt: string;
  categories: HashtagCategory[];   // ultra-niche / niche / mid-tier / broad
  avoidList: string[];             // oversaturated tags to avoid
  weeklyRotationPlan: string;      // text advice on rotating tags
  captionMixFormula: string;       // e.g. "5 niche + 3 mid-tier + 2 broad per post"
}
```

### Anti-Patterns to Avoid

- **Using `Promise.all` instead of `Promise.allSettled` for provider calls:** One flaky provider kills the whole request. Use `Promise.allSettled` and degrade gracefully.
- **Hardcoding model IDs in route files:** Centralize model ID constants in `src/lib/ai/models.ts` so version bumps are single-file changes.
- **Calling synthesis with only 1 report:** If 2 providers fail, skip synthesis and return the single successful report directly — synthesis of 1 report wastes tokens.
- **Storing calendar/comparison reports in the same `reports` table without a `report_type` column:** Add a `report_type TEXT DEFAULT 'analysis'` column or use separate tables to avoid mixing report shapes in `report_data` JSONB.
- **Skipping token caps:** Multi-agent means 4 API calls per analysis (3 workers + 1 synthesis). Set `max_tokens: 8192` for workers and `max_tokens: 4096` for synthesis to control costs.
- **Re-analyzing all 3 profiles for competitor compare:** Profiles that are already saved in Supabase reports should be fetched from cache — only scrape+analyze profiles that have no recent report.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAI-compatible HTTP client | Custom fetch wrapper | `openai` npm package (already installed) | Handles retries, timeout, streaming, type safety |
| Multi-provider routing | Custom provider registry | OpenRouter unified gateway | Single API key, automatic failover, no per-provider billing setup |
| JSON extraction from AI response | Custom regex parser | Existing `parseAnalysisJson` pattern from `claude-api.ts` | Already handles markdown fences and brace extraction |
| Cache TTL management | Custom in-memory or Redis TTL | Supabase `created_at` column + `.gt()` filter | Already in schema, serverless-safe, zero extra infra |
| Competitor data aggregation | Custom metric comparison engine | AI prompt that receives all profiles as JSON and outputs structured comparison | AI handles metric normalization and narrative in one call |

**Key insight:** The existing prompt system, JSON parsing pattern, and Supabase client are the core infrastructure. New providers are 20-line wrappers, not new systems.

## Common Pitfalls

### Pitfall 1: Vercel 60-Second Function Timeout on Multi-Agent Calls

**What goes wrong:** 3 parallel AI calls + synthesis = 4 sequential-ish network roundtrips. If each takes 15-20s, total wall time can exceed Vercel Pro's 60s limit.

**Why it happens:** Workers run in parallel (good) but synthesis must wait for all workers. Large prompts with 8192 max_tokens can take 15-20s each for GPT-4o-mini and Gemini.

**How to avoid:**
- Set `max_tokens: 6144` for workers (reduces TTFT and generation time)
- Use streaming with timeout for each worker (abort if > 25s)
- The synthesis call uses the 3 already-returned JSON responses — it's a compression task, so set `max_tokens: 4096`
- Consider reducing workers to `max_tokens: 4096` if latency is consistently over 30s in testing

**Warning signs:** Response time > 45s in testing, Vercel function timeout errors in production logs.

### Pitfall 2: JSON Parse Failure from One Provider Poisons Synthesis

**What goes wrong:** GPT-4o-mini or Gemini returns malformed JSON (extra text, truncated response, markdown in JSON values). Synthesis prompt includes broken JSON, causing the synthesis to also fail.

**Why it happens:** Not all models follow "return ONLY valid JSON" as reliably as Claude. GPT-4o-mini and Gemini Flash sometimes wrap JSON in markdown or add preamble.

**How to avoid:**
- Apply the same markdown/brace stripping logic from `claude-api.ts` to all provider wrappers
- Validate parsed JSON against required fields before including in synthesis (check `profileScore` and `engagementStats` exist)
- Return `null` from a provider wrapper if JSON is invalid — orchestrator handles missing reports gracefully

**Warning signs:** `JSON.parse` exceptions, synthesis model returning "I cannot synthesize because report 2 contains invalid data".

### Pitfall 3: OpenRouter Rate Limits on Burst Traffic

**What goes wrong:** 3 simultaneous OpenRouter calls per user × multiple concurrent users = rate limit (429) from OpenRouter or underlying providers.

**Why it happens:** OpenRouter enforces per-model rate limits. Free OpenRouter tier has lower limits. Some providers (Gemini) have separate rate limits that OpenRouter cannot bypass.

**How to avoid:**
- Handle 429 in provider wrappers (return `null`, let orchestrator degrade)
- Add OpenRouter API key to a paid tier before production launch
- Monitor which provider fails most often and adjust worker selection

**Warning signs:** `429 Too Many Requests` in provider wrappers during load testing.

### Pitfall 4: openai Package Not in package.json (Only Transitive)

**What goes wrong:** `openai` is currently in `node_modules` as a transitive dependency of another package. If that parent package removes it or pins a different version, the OpenRouter client silently breaks.

**Why it happens:** Transitive dependencies are not guaranteed stable.

**How to avoid:** Run `npm install openai` to add it as a direct dependency in `package.json`. Verify `"openai": "^6.x.x"` appears in `dependencies`.

**Warning signs:** `Cannot find module 'openai'` after a `npm ci` or dependency update.

### Pitfall 5: Synthesis Prompt Exceeding Context Window

**What goes wrong:** Three full `AnalysisReport` JSON objects fed into synthesis prompt = ~6000-9000 tokens of input. Combined with prompt instructions, this approaches Claude Haiku's effective sweet spot.

**Why it happens:** Each worker report with all contentPillars, roadmap, actionItems is ~2000-3000 tokens of JSON.

**How to avoid:** Use `anthropic/claude-sonnet-4` for synthesis (200K context, strong JSON compliance). The Sonnet model is only called once per Pro analysis — cost is justified.

### Pitfall 6: RLS Blocks Cache Lookup for Different Users

**What goes wrong:** User A analyzed `@nike` on Instagram 30 minutes ago. User B analyzes same profile — cache lookup returns nothing because User B's `auth.uid()` doesn't match User A's `user_id` in reports.

**Why it happens:** The `reports` RLS policy is `auth.uid() = user_id` — each user only sees their own reports.

**How to avoid:** For the 1-hour dedup cache, the intended behavior per D-15 is per-user caching, not cross-user. This is actually correct behavior — each user gets their own cached report. The cache prevents the same user from wasting API calls by re-analyzing the same handle twice within an hour. Accept this design: it's per-user dedup, not global dedup. Document this clearly in the route handler.

## Code Examples

### Provider Wrapper Pattern (verified from claude-api.ts + OpenRouter docs)

```typescript
// src/lib/ai/providers/gemini.ts
import { createOpenRouterClient } from "../openrouter-client";
import { AnalysisReport } from "@/lib/types";

const GEMINI_MODEL = "google/gemini-2.0-flash-001";

export async function analyzeWithGemini(
  prompt: string
): Promise<AnalysisReport | null> {
  const client = createOpenRouterClient();

  try {
    const completion = await client.chat.completions.create({
      model: GEMINI_MODEL,
      max_tokens: 6144,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    if (!text) return null;

    // Reuse same JSON extraction pattern from claude-api.ts
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) return null;

    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    const report: AnalysisReport = JSON.parse(jsonStr);

    // Basic validation — ensure required top-level fields exist
    if (!report.profileScore || !report.engagementStats) return null;

    return report;
  } catch {
    return null;
  }
}
```

### Cache Lookup in analyze route (verified from Supabase docs)

```typescript
// In src/app/api/analyze/route.ts — add before scraping step
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

const { data: cached } = await supabase
  .from("reports")
  .select("report_data")
  .eq("platform", platform)
  .eq("username", username.toLowerCase())
  .gt("created_at", oneHourAgo.toISOString())
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (cached?.report_data) {
  return NextResponse.json({ success: true, report: cached.report_data, cached: true });
}
```

### Orchestrator Route Extension Pattern

```typescript
// In src/app/api/analyze/route.ts — step 7, replace current analyzeWithApi call
const analysis = isPro
  ? await runMultiAgentAnalysis(profileData, nlpResult, trendResult)
  : await analyzeWithApi(profileData, nlpResult, trendResult);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate API keys per provider | OpenRouter unified gateway | 2023+ | Single key, 300+ models |
| Sequential AI fallback chains | Parallel Promise.allSettled | 2024+ | 3x faster multi-agent |
| Anthropic SDK for all Anthropic calls | OpenAI SDK with OpenRouter baseURL | Enabled now | One SDK for all providers |
| GPT-3.5-turbo for cheap workers | GPT-4o-mini / Gemini Flash | 2024 | Better quality at same/lower cost |

**Current best model choices (Claude's discretion — March 2026):**
- Worker agents: `anthropic/claude-3.5-haiku`, `openai/gpt-4o-mini`, `google/gemini-2.0-flash-001`
- Synthesizer: `anthropic/claude-sonnet-4`
- Rationale: Haiku is the fastest Anthropic worker. GPT-4o-mini has strong JSON adherence. Gemini 2.0 Flash is the cheapest at $0.10/1M input. Sonnet-4 for synthesis gives the best quality unified output.

## Open Questions

1. **Is `openai` in `package.json` directly or only as a transitive dep?**
   - What we know: `npm view openai version` returns 6.33.0 and it's in `node_modules`
   - What's unclear: Whether it's in `package.json` `dependencies` or only indirect
   - Recommendation: Wave 0 task should run `npm install openai` to ensure it's a direct dependency

2. **Should calendar/hashtag reports use the existing `reports` table or new tables?**
   - What we know: `reports` table has `report_data JSONB` — flexible enough for any shape
   - What's unclear: Will Phase 5 (growth tracking) need to query calendar vs. analysis reports separately?
   - Recommendation: Add `report_type TEXT NOT NULL DEFAULT 'analysis'` column. Values: `'analysis'`, `'calendar'`, `'comparison'`, `'hashtags'`. This one column enables future filtering without schema redesign.

3. **Competitor comparison: when user selects from saved reports, does each saved report represent a full profile scrape?**
   - What we know: `reports` table stores `report_data` (AnalysisReport) not the raw `NormalizedProfile`
   - What's unclear: Comparison needs raw metric data — `followersCount`, `engagementRate` etc. Does `AnalysisReport` contain enough of this?
   - Recommendation: For comparison, re-scrape handles that don't have a fresh cache hit, rather than trying to reconstruct profile data from saved reports. The scraper is fast (~2-5s). Alternatively, store raw profile data in `reports` alongside `report_data` — a simple schema addition.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| openai npm package | OpenRouter client | Confirmed in node_modules | 6.33.0 | None needed — directly installable |
| OPENROUTER_API_KEY | Multi-agent Pro analysis | Not set (must add to .env) | — | Free users use ANTHROPIC_API_KEY |
| ANTHROPIC_API_KEY | Free-tier single-agent | Already set (from Phase 1) | — | — |
| Supabase reports table | 1-hour cache (D-15) | Confirmed in schema.sql | — | — |

**Missing dependencies with no fallback:**
- `OPENROUTER_API_KEY` environment variable — must be added to Vercel environment variables and local `.env.local` before multi-agent analysis works. Wave 0 should document this.

**Missing dependencies with fallback:**
- None beyond the API key.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured, `passWithNoTests: true`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Multi-agent orchestrator returns synthesized AnalysisReport | unit | `npx vitest run src/lib/ai/orchestrator.test.ts` | Wave 0 |
| AI-01 | Partial provider failure (1-2 agents fail) still returns report | unit | `npx vitest run src/lib/ai/orchestrator.test.ts` | Wave 0 |
| AI-02 | Free-tier path calls analyzeWithApi, not orchestrator | unit | `npx vitest run src/app/api/analyze/route.test.ts` | Wave 0 |
| AI-03 | Competitor comparison returns metricsTable + narrative | unit | `npx vitest run src/lib/ai/compare.test.ts` | Wave 0 |
| AI-04 | Calendar report has 4 weeks × 7 days = 28 CalendarEntry objects | unit | `npx vitest run src/lib/ai/calendar.test.ts` | Wave 0 |
| AI-05 | Hashtag strategy has at least 3 categories | unit | `npx vitest run src/lib/ai/hashtags.test.ts` | Wave 0 |
| AI-06 | Cache hit returns report without calling AI provider | unit | `npx vitest run src/app/api/analyze/route.test.ts` | Wave 0 |

**Note:** All AI provider calls in tests must be mocked. No live API calls in tests.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ai/orchestrator.test.ts` — covers AI-01 (multi-agent + partial failure)
- [ ] `src/app/api/analyze/route.test.ts` — covers AI-02 (free path) + AI-06 (cache hit)
- [ ] `src/lib/ai/compare.test.ts` — covers AI-03
- [ ] `src/lib/ai/calendar.test.ts` — covers AI-04
- [ ] `src/lib/ai/hashtags.test.ts` — covers AI-05
- [ ] Mock utilities for OpenRouter/Anthropic SDK calls

## Sources

### Primary (HIGH confidence)
- https://openrouter.ai/anthropic/claude-3.5-haiku/api — model ID `anthropic/claude-3.5-haiku` confirmed, TypeScript OpenAI SDK code example
- https://openrouter.ai/google/gemini-2.0-flash-001 — model ID `google/gemini-2.0-flash-001` confirmed, pricing $0.10/$0.40 per 1M tokens
- https://openrouter.ai/docs/quickstart — baseURL `https://openrouter.ai/api/v1`, defaultHeaders pattern
- `src/lib/supabase/schema.sql` — `reports` table confirmed with `platform`, `username`, `created_at` columns
- `src/lib/claude-api.ts` — existing analyzeWithApi pattern, JSON extraction logic, error handling
- `src/lib/types.ts` — AnalysisReport, ContentCalendarDay existing definitions
- `src/app/api/analyze/route.ts` — isPro check, Promise.all pattern, existing route structure
- https://supabase.com/docs/reference/javascript/filter — `.gt()` timestamp filter pattern

### Secondary (MEDIUM confidence)
- WebSearch cross-referenced: `openai/gpt-4o-mini` model ID — consistent across multiple OpenRouter docs references
- WebSearch: `anthropic/claude-sonnet-4` model ID — confirmed at openrouter.ai/anthropic/claude-sonnet-4
- Pricing data for worker models — sourced from openrouter.ai model pages (prices can change)

### Tertiary (LOW confidence)
- Vercel 60s timeout concern — based on known Vercel Pro function limits + estimated AI response times; needs empirical testing
- Per-analysis cost estimate (~$0.04-0.06) — calculated from listed pricing; actual usage varies by prompt length

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `openai` package confirmed in node_modules; OpenRouter integration verified from official docs; model IDs confirmed from openrouter.ai
- Architecture: HIGH — patterns derived from existing codebase (`claude-api.ts` is direct template) + verified OpenRouter SDK docs
- Pitfalls: MEDIUM — Vercel timeout and rate limit pitfalls are well-known but need empirical validation for this specific prompt size
- Type designs: HIGH — derived from locked CONTEXT.md decisions (D-10, D-11, D-08) and existing type patterns in `types.ts`

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (model IDs and pricing are relatively stable; verify before billing changes)
