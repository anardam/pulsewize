---
phase: 04-ai-enhancement
plan: "03"
subsystem: ai
tags: [openrouter, multi-agent, claude, gpt, gemini, orchestration, synthesis]

# Dependency graph
requires:
  - phase: 04-01
    provides: MultiAgentMetadata type in types.ts (added here as deviation since 04-01 not yet run)
provides:
  - OpenRouter client (createOpenRouterClient) pointed at https://openrouter.ai/api/v1
  - Model ID constants centralized in models.ts (no hardcoded IDs in providers)
  - 3 provider wrappers: analyzeWithClaude, analyzeWithGpt, analyzeWithGemini
  - Multi-agent orchestrator (runMultiAgentAnalysis) using Promise.allSettled
  - Synthesizer (synthesizeReports) using Claude Sonnet 4 via OpenRouter
affects: [04-04, 04-05, src/app/api/analyze]

# Tech tracking
tech-stack:
  added: [openai@^6.33.0 (OpenAI-compatible SDK used for OpenRouter)]
  patterns:
    - Provider wrapper pattern — all providers share same signature and JSON extraction logic
    - Promise.allSettled for graceful degradation (partial failure still returns a valid report)
    - Centralized model constants (models.ts) — update model versions in one place

key-files:
  created:
    - src/lib/ai/models.ts
    - src/lib/ai/openrouter-client.ts
    - src/lib/ai/providers/claude.ts
    - src/lib/ai/providers/openai.ts
    - src/lib/ai/providers/gemini.ts
    - src/lib/ai/orchestrator.ts
    - src/lib/ai/synthesizer.ts
  modified:
    - src/lib/types.ts (added MultiAgentMetadata interface and multiAgentMeta field on AnalysisReport)
    - package.json (added openai@^6.33.0 as direct dependency)

key-decisions:
  - "openai package (v6) used for OpenRouter — OpenRouter is OpenAI-compatible, no separate SDK needed"
  - "Promise.allSettled chosen over Promise.all — 1-2 provider failures are non-fatal"
  - "Workers capped at WORKER_MAX_TOKENS=6144; synthesis at SYNTHESIS_MAX_TOKENS=4096 for cost control (AI-06)"
  - "MultiAgentMetadata added to types.ts here (deviation from plan ordering — 04-01 not yet run)"
  - "Synthesizer skips synthesis for single-provider results — no value in synthesizing one report"

patterns-established:
  - "Provider wrapper pattern: (prompt: string) => Promise<AnalysisReport | null> — never throws, returns null on failure"
  - "JSON extraction reused verbatim from claude-api.ts — strip markdown fences, find first/last brace"
  - "Orchestrator builds prompt once, fans out to 3 providers, collects successful results, synthesizes"

requirements-completed: [AI-01, AI-06]

# Metrics
duration: 10min
completed: 2026-03-31
---

# Phase 4 Plan 03: Multi-Agent AI Layer Summary

**Complete multi-agent pipeline: 3 parallel worker providers (Claude Haiku, GPT-4o-mini, Gemini Flash) via OpenRouter with Claude Sonnet 4 synthesis, using Promise.allSettled for graceful degradation and centralized model constants for cost control.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-31T20:42:00+11:00
- **Completed:** 2026-03-31T20:52:00+11:00
- **Tasks:** 2 completed
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments

- Built complete multi-agent AI layer in src/lib/ai/ with 7 new files
- 3 provider wrappers (Claude Haiku, GPT-4o-mini, Gemini Flash) — all via OpenRouter using the openai SDK, same JSON extraction pattern as existing claude-api.ts
- Orchestrator fans out to all 3 workers in parallel via Promise.allSettled; partial failure still returns a valid AnalysisReport
- Synthesizer uses Claude Sonnet 4 to merge multiple reports; falls back to first successful report if synthesis fails
- Added MultiAgentMetadata interface and optional field to AnalysisReport (deviation — 04-01 not yet run)

## Task Commits

1. **Task 1: OpenRouter client, model constants, and 3 provider wrappers** - `66df2b1` (feat)
2. **Task 2: Multi-agent orchestrator and synthesizer** - `d0366a3` (feat)

## Files Created/Modified

- `src/lib/ai/models.ts` - Centralized model ID constants and token caps
- `src/lib/ai/openrouter-client.ts` - OpenAI-compatible client pointed at OpenRouter
- `src/lib/ai/providers/claude.ts` - Claude Haiku provider wrapper (analyzeWithClaude)
- `src/lib/ai/providers/openai.ts` - GPT-4o-mini provider wrapper (analyzeWithGpt)
- `src/lib/ai/providers/gemini.ts` - Gemini Flash provider wrapper (analyzeWithGemini)
- `src/lib/ai/orchestrator.ts` - Multi-agent orchestration (runMultiAgentAnalysis)
- `src/lib/ai/synthesizer.ts` - Report synthesis via Claude Sonnet 4 (synthesizeReports)
- `src/lib/types.ts` - Added MultiAgentMetadata interface + multiAgentMeta field
- `package.json` - Added openai@^6.33.0 as direct dependency

## Model IDs and Token Caps

| Constant | Value | Role |
|----------|-------|------|
| CLAUDE_HAIKU_MODEL | anthropic/claude-3.5-haiku | Worker (fast, cost-effective) |
| GPT_MINI_MODEL | openai/gpt-4o-mini | Worker (fast, cost-effective) |
| GEMINI_FLASH_MODEL | google/gemini-2.0-flash-001 | Worker (fast, cost-effective) |
| CLAUDE_SYNTHESIS_MODEL | anthropic/claude-sonnet-4 | Synthesizer (highest quality) |
| WORKER_MAX_TOKENS | 6144 | Cost control per AI-06 |
| SYNTHESIS_MAX_TOKENS | 4096 | Cost control per AI-06 |

## Setup Required

`OPENROUTER_API_KEY` must be set in Vercel environment variables before Pro analysis works.
- Get key from: OpenRouter Dashboard (openrouter.ai) -> Keys -> Create key
- Add in: Vercel Dashboard -> Project -> Settings -> Environment Variables

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added MultiAgentMetadata to types.ts**
- **Found during:** Task 2 (orchestrator.ts imports MultiAgentMetadata from @/lib/types)
- **Issue:** Plan 04-01 (which adds MultiAgentMetadata) has not been run yet, so the type was missing
- **Fix:** Added MultiAgentMetadata interface and multiAgentMeta?: MultiAgentMetadata field to AnalysisReport in src/lib/types.ts
- **Files modified:** src/lib/types.ts
- **Commit:** 66df2b1

## Self-Check: PASSED
