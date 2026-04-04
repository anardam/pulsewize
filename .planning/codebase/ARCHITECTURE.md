# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Single-page Next.js App Router application with a client-rendered frontend and server-side API routes acting as a backend-for-frontend (BFF).

**Key Characteristics:**
- Single route (`/`) with state-machine driven UI rendering all views
- API routes handle data scraping, enrichment, and AI analysis on the server
- Multi-strategy scraping with ordered fallback chains (different for local vs Vercel)
- Two AI backends: Claude Code CLI (local) and Anthropic HTTP API (deployed/API key)
- No database; all persistence is browser-side localStorage

## Layers

**Presentation Layer (Client):**
- Purpose: Renders all UI states and handles user interaction
- Location: `src/app/page.tsx`, `src/components/`
- Contains: A single page component with state machine, plus presentational sub-components
- Depends on: `src/lib/types.ts` for type definitions, `src/lib/report-history.ts` for localStorage persistence
- Used by: End users via browser

**API Layer (Server):**
- Purpose: Orchestrates scraping, enrichment, and AI analysis
- Location: `src/app/api/`
- Contains: Three route handlers (`analyze`, `health`, `insta-login`)
- Depends on: All `src/lib/` modules
- Used by: Presentation layer via `fetch()`

**Scraping Layer (Server):**
- Purpose: Fetches Instagram profile data from multiple sources
- Location: `src/lib/instagram.ts`, `src/lib/scraper-puppeteer.ts`, `src/lib/instaloader.ts`, `src/lib/scraper-rapidapi.ts`
- Contains: Four independent scraper implementations with a common return shape
- Depends on: External APIs and tools (Instagram web API, Puppeteer/Chrome, Python/Instaloader, RapidAPI)
- Used by: `src/app/api/analyze/route.ts`

**Enrichment Layer (Server):**
- Purpose: Adds NLP and trend data to scraped profile data before AI analysis
- Location: `src/lib/nlp.ts`, `src/lib/trends.ts`
- Contains: Caption NLP analysis (TF-IDF, sentiment) and Google Trends direction
- Depends on: `natural` (NLP library), `google-trends-api`
- Used by: `src/app/api/analyze/route.ts`

**AI Analysis Layer (Server):**
- Purpose: Sends profile + enrichment data to Claude for strategic analysis
- Location: `src/lib/claude-api.ts`, `src/lib/claude-cli.ts`, `src/lib/prompt.ts`
- Contains: Prompt builder, two Claude invocation strategies (HTTP API, CLI subprocess)
- Depends on: `@anthropic-ai/sdk`, Claude Code CLI binary
- Used by: `src/app/api/analyze/route.ts`

**Infrastructure Layer (Server):**
- Purpose: Cross-cutting concerns (rate limiting, health checks)
- Location: `src/lib/rate-limit.ts`, `src/app/api/health/route.ts`
- Contains: In-memory IP-based rate limiter, CLI/environment health checker
- Depends on: Nothing external
- Used by: `src/app/api/analyze/route.ts`, `src/app/page.tsx` (health check)

## Data Flow

**Primary Analysis Flow (username input):**

1. User enters Instagram username in `src/app/page.tsx`
2. Client POSTs to `/api/analyze` with `{ username }` and optional `x-api-key` header
3. `src/app/api/analyze/route.ts` checks rate limit via `src/lib/rate-limit.ts`
4. Scraping cascade runs (order depends on environment):
   - **Vercel:** RapidAPI (`src/lib/scraper-rapidapi.ts`) -> Instagram public API (`src/lib/instagram.ts`)
   - **Local:** Puppeteer (`src/lib/scraper-puppeteer.ts`) -> Instaloader (`src/lib/instaloader.ts`) -> RapidAPI -> Instagram API
5. If all scrapers fail, returns `{ requiresManualEntry: true }` (HTTP 422)
6. NLP caption analysis and Google Trends run in parallel (`Promise.all`)
7. Profile data + NLP + trends sent to Claude via API or CLI (`src/lib/claude-api.ts` or `src/lib/claude-cli.ts`)
8. Claude returns structured JSON matching `AnalysisReport` type
9. Response returned to client; `ReportDashboard` renders the report

**Manual Entry Flow:**

1. User fills form in `src/components/ManualEntryForm.tsx`
2. Client POSTs to `/api/analyze` with `{ manualData }` (skips scraping entirely)
3. Steps 6-9 from above apply

**Health Check Flow:**

1. On mount, `src/app/page.tsx` checks for stored API key in localStorage
2. If no key found, calls `GET /api/health` to check Claude CLI availability
3. `src/app/api/health/route.ts` detects Vercel environment and/or runs `which claude`
4. If neither CLI nor API key is available, prompts user to add API key

**State Management:**

- All UI state lives in `src/app/page.tsx` via `useState` hooks
- App state is modeled as a finite state machine with `AppState` type: `"checking" | "healthy" | "unhealthy" | "input" | "manual" | "loading" | "report" | "error"`
- API key stored in `localStorage` under key `anthropic_api_key`
- Report history stored in `localStorage` under key `sociallens_reports` (last 20 reports)
- No global state library (Redux, Zustand, etc.) is used

## Key Abstractions

**Scraper Result:**
- Purpose: Uniform return type for all four scraping strategies
- Shape: `{ success: boolean; profile?: InstagramProfile; error?: string }`
- Implementations: `src/lib/instagram.ts`, `src/lib/scraper-puppeteer.ts`, `src/lib/instaloader.ts`, `src/lib/scraper-rapidapi.ts`
- Pattern: Strategy pattern with ordered fallback chain in the route handler

**Analysis Result:**
- Purpose: Uniform return type for both Claude invocation methods
- Shape: `{ success: boolean; report?: AnalysisReport; error?: string }`
- Implementations: `src/lib/claude-api.ts` (`analyzeWithApi`), `src/lib/claude-cli.ts` (`analyzeProfile`)
- Pattern: Strategy pattern; API key presence determines which is used

**AnalysisReport:**
- Purpose: The central domain type representing a complete profile analysis
- Definition: `src/lib/types.ts` (lines 141-175)
- Contains: 14 top-level fields covering scores, engagement, content strategy, roadmap, monetisation, NLP, and trends
- Generated by: Claude AI, parsed from JSON response
- Consumed by: `src/components/ReportDashboard.tsx`

## Entry Points

**Web Application:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Renders all UI states, handles form submissions, manages app state

**Analyze API:**
- Location: `src/app/api/analyze/route.ts`
- Triggers: POST from client with `{ username }` or `{ manualData }`
- Responsibilities: Orchestrates the full scrape -> enrich -> analyze pipeline

**Health API:**
- Location: `src/app/api/health/route.ts`
- Triggers: GET from client on page load (when no API key stored)
- Responsibilities: Reports environment capabilities (CLI, Vercel, server API key)

**Instagram Login API:**
- Location: `src/app/api/insta-login/route.ts`
- Triggers: POST with Instagram credentials
- Responsibilities: Runs Python/Instaloader login to save session for authenticated scraping

## Error Handling

**Strategy:** Fail gracefully with user-friendly messages; cascade to fallback strategies on scraping failures.

**Patterns:**
- Scraper cascade: each scraper catches its own errors and returns `{ success: false, error }`. The route handler tries the next scraper in sequence.
- AI analysis: catches specific error types (auth, rate limit, JSON parse) and returns targeted error messages
- Client: displays error state with "Try Again" button; specific scrape failures trigger manual entry fallback
- Rate limiting: in-memory sliding window (5 requests/hour per IP) returns HTTP 429

## Cross-Cutting Concerns

**Logging:** `console.error` in `src/lib/nlp.ts` and `src/lib/trends.ts`. No structured logging framework.

**Validation:** Basic input validation in API routes (username or manualData required). No schema validation library (e.g., Zod).

**Authentication:** No user auth system. API key for Claude is either passed from client via `x-api-key` header (stored in localStorage) or read from `ANTHROPIC_API_KEY` env var on the server.

**Rate Limiting:** In-memory per-IP rate limiter in `src/lib/rate-limit.ts`. 5 analyses per hour per IP. Resets on server restart (no persistent store).

**Environment Detection:** `process.env.VERCEL` is checked to determine scraping strategy order and health check behavior. Used in `src/app/api/analyze/route.ts` and `src/app/api/health/route.ts`.

---

*Architecture analysis: 2026-03-31*
