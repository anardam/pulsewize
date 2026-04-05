<!-- GSD:project-start source:PROJECT.md -->
## Project

**SocialLens**

A multi-platform social media analyzer that uses Anthropic Codex AI to generate deep growth strategies, content calendars, hashtag strategies, and competitor comparisons across Instagram, Twitter/X, TikTok, YouTube, LinkedIn, and Facebook. Users sign up, analyze profiles, track growth over time, and subscribe for premium features.

**Core Value:** AI-powered social media analysis that gives creators and businesses actionable growth strategies — the analysis quality and actionability of reports is the ONE thing that must work.

### Constraints

- **Platform**: Vercel deployment — serverless function limits (10s default, 60s pro), no persistent processes
- **AI Cost**: Codex API calls are the primary cost driver — need usage limits per tier
- **Scraping**: Social platform APIs are unreliable/rate-limited — need multiple fallback strategies per platform
- **Budget**: Freemium model means costs must be controlled before revenue — Supabase free tier, careful API usage
- **UI Design**: Modern, clean aesthetic — minimal, polished pages throughout the app
- **Payments**: Dual payment provider (Stripe + Razorpay) adds complexity but enables global reach
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^5 - All application code (`src/**/*.ts`, `src/**/*.tsx`)
- Python 3 - Inline scripts for Instaloader scraping (`src/lib/instaloader.ts`, `src/app/api/insta-login/route.ts`)
- CSS - Global styles with Tailwind (`src/app/globals.css`)
## Runtime
- Node.js (version not pinned; no `.nvmrc` present)
- Python 3 (required for Instaloader scraping, resolved via project `.venv/bin/python3` or system `python3`)
- npm
- Lockfile: `package-lock.json` (present)
## Frameworks
- Next.js 14.2.35 - Full-stack React framework (App Router)
- React ^18 - UI library
- React DOM ^18 - DOM rendering
- None configured (no test framework, no test config files, no test files)
- Next.js built-in bundler (Turbopack/Webpack)
- TypeScript ^5 - Type checking
- ESLint ^8 with `eslint-config-next` 14.2.35 - Linting
- PostCSS ^8 - CSS processing (`postcss.config.mjs`)
- Tailwind CSS ^3.4.1 - Utility-first CSS (`tailwind.config.ts`)
## Key Dependencies
- `@anthropic-ai/sdk` ^0.80.0 - Anthropic Codex API client for AI-powered profile analysis (`src/lib/Codex-api.ts`)
- `puppeteer-core` ^24.40.0 - Headless browser scraping of Instagram profiles (`src/lib/scraper-puppeteer.ts`)
- `@sparticuz/chromium` ^143.0.4 - Serverless-compatible Chromium binary for Puppeteer on Vercel (`src/lib/scraper-puppeteer.ts`)
- `natural` ^8.1.1 - NLP library for TF-IDF keyword extraction and sentiment analysis on captions (`src/lib/nlp.ts`)
- `google-trends-api` ^4.9.2 - Google Trends data for niche trend direction analysis (`src/lib/trends.ts`)
- `html2pdf.js` ^0.14.0 - Client-side PDF generation for report export (referenced in components)
- `@types/node` ^20
- `@types/react` ^18
- `@types/react-dom` ^18
- `src/types/google-trends-api.d.ts` - Type declarations for `google-trends-api` package
- `src/types/html2pdf.d.ts` - Type declarations for `html2pdf.js` package
## Configuration
- Config: `tsconfig.json`
- Strict mode enabled
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./src/*`
- JSX: `preserve` (Next.js handles transformation)
- Incremental compilation enabled
- Config: `tailwind.config.ts`
- Dark mode: `class`-based
- Custom CSS variables for `background` and `foreground` colors
- Custom animations: `pulse-slow`, `gradient-x`
- Content paths: `src/pages/**`, `src/components/**`, `src/app/**`
- Config: `next.config.mjs` (empty/default configuration)
- Uses `eslint-config-next` (no custom `.eslintrc` file detected)
- `ANTHROPIC_API_KEY` - Server-side Anthropic API key (optional; client can also provide via header)
- `RAPIDAPI_KEY` - RapidAPI key for Instagram scraping services
- `VERCEL` - Auto-set by Vercel deployment platform; controls scraping strategy
## Platform Requirements
- Node.js with npm
- Python 3 with `instaloader` package (optional, for local scraping)
- Google Chrome or Chromium installed locally (optional, for Puppeteer scraping)
- Codex CLI installed (optional, alternative to API key for analysis)
- Vercel serverless functions
- `@sparticuz/chromium` provides Chromium in serverless (though Puppeteer is deprioritized on Vercel)
- `RAPIDAPI_KEY` recommended for reliable scraping on Vercel
- Either `ANTHROPIC_API_KEY` server env var or client-provided API key required
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: PascalCase (e.g., `src/components/ReportDashboard.tsx`, `src/components/ApiKeyModal.tsx`)
- Library modules: kebab-case (e.g., `src/lib/Codex-api.ts`, `src/lib/rate-limit.ts`, `src/lib/scraper-rapidapi.ts`)
- API routes: lowercase directory names following Next.js App Router convention (e.g., `src/app/api/analyze/route.ts`, `src/app/api/health/route.ts`)
- Type declaration files: kebab-case with `.d.ts` suffix (e.g., `src/types/google-trends-api.d.ts`)
- Use camelCase for all functions: `analyzeProfile`, `checkRateLimit`, `scrapeWithRapidApi`, `buildAnalysisPrompt`
- Exported functions use descriptive verb-noun naming: `analyzeWithApi`, `scrapeInstagramProfile`, `getTrendDirection`
- Helper/private functions use shorter names: `parseResponse`, `extractPosts`, `asNumber`, `asString`, `cleanEnv`
- React event handlers prefixed with `handle`: `handleAnalyze`, `handleManualSubmit`, `handleApiKeyModalClose`
- Use camelCase: `profileData`, `apiKey`, `scrapeError`, `lastError`
- Boolean variables use `is`/`has` prefix: `isVercel`, `hasApiKey`, `isPrivate`, `isVerified`
- Constants at module level use UPPER_SNAKE_CASE: `MAX_REQUESTS`, `WINDOW_MS`, `STORAGE_KEY`, `STEPS`
- Use `interface` for object shapes: `InstagramProfile`, `AnalysisReport`, `HealthCheckResponse`
- Use `type` for unions: `type AppState = "checking" | "healthy" | "unhealthy" | ...`
- Component props use `Props` as interface name (local to file): `interface Props { ... }`
- API response types follow `{ success: boolean; data?: T; error?: string }` envelope pattern
## Code Style
- No Prettier config file detected; relies on ESLint defaults
- Semicolons: always used
- Quotes: double quotes for strings
- Trailing commas: used in multi-line arrays/objects
- Indentation: 2 spaces
- ESLint with `next/core-web-vitals` and `next/typescript` presets
- Config file: `.eslintrc.json`
- Run via: `npm run lint` (which runs `next lint`)
## TypeScript Configuration
- Module resolution: `bundler`
- JSX: `preserve` (Next.js handles transformation)
- Path alias: `@/*` maps to `./src/*`
- `skipLibCheck: true`
- `isolatedModules: true`
- Explicit return types on exported async functions (e.g., `Promise<{ success: boolean; report?: AnalysisReport; error?: string }>`)
- Inline type annotations for request body parsing: `const { username, manualData } = body as { username?: string; manualData?: ManualProfileInput }`
- `Record<string, unknown>` used for untyped API response parsing in `src/lib/scraper-rapidapi.ts`
- Custom type declaration files for untyped packages in `src/types/`
## Import Organization
- `@/*` resolves to `./src/*` -- use this for all internal imports
- Never use relative paths like `../../lib/types`; always use `@/lib/types`
## CSS / Styling Approach
- All styling is inline Tailwind classes in JSX
- No CSS modules or styled-components
- Dark mode: hardcoded via `class="dark"` on `<html>` element (not togglable)
- `.gradient-text` -- gradient text effect (purple/pink/orange)
- `.card-glow` -- hover glow effect for cards
- `.animate-progress` -- progress bar animation
- Custom scrollbar styling (webkit)
- CSS variables: `--background` and `--foreground` (dark theme only)
- `animate-pulse-slow` -- slower pulse animation
- `animate-gradient-x` -- horizontal gradient animation
- `colors.background` and `colors.foreground` mapped to CSS variables
- Background: `bg-gray-900/50`, `bg-gray-800/50`, `bg-[#0a0a0f]`
- Accent gradient: `from-purple-600 via-pink-600 to-orange-500`
- Text: `text-white`, `text-gray-400`, `text-gray-500` for muted
- Success: `text-green-400`, Error: `text-red-400`
- Use opacity suffixes: `bg-purple-500/10`, `bg-purple-500/20`
- Mobile-first with `sm:` breakpoint overrides
- Example: `text-4xl sm:text-5xl`, `py-3.5 sm:py-4`, `gap-3 sm:gap-4`
## Component Patterns
- All components are functional components using `export default function ComponentName`
- Client components marked with `"use client"` directive at top of file
- Server components: only `src/app/layout.tsx` (no directive)
- Props defined as `interface Props` at the top of the file
- Destructured in function signature: `function Component({ prop1, prop2 }: Props)`
- No `React.FC` usage
- `useState` for local state; no global state library
- `localStorage` for persistence (API key, report history)
- No React Context providers
- `useState`, `useEffect`, `useRef`, `useCallback` from React
- No custom hooks defined
- `useEffect` for initialization logic (health checks, localStorage reads)
- Components defined inline within parent when small (e.g., `SettingsButton` and `ApiKeyBadge` in `src/app/page.tsx`)
- Larger components extracted to `src/components/`
## Error Handling
- Try-catch wrapping entire route handler
- `error instanceof Error ? error.message : "Unknown error occurred"` pattern for safe error extraction
- Return structured JSON: `{ success: false, error: "message" }` with appropriate HTTP status codes
- Specific error message matching for known error types (401, 429, JSON parse, timeout)
- Try-catch around `fetch` calls
- Error state managed via `useState`
- Generic fallback: `"Network error. Please try again."`
- Empty `catch {}` blocks (no error variable) used for non-critical failures
- Return `{ success: boolean; error?: string }` result objects instead of throwing
- Graceful degradation: scraper functions try multiple providers, falling through on failure
- `console.error` used in `src/lib/nlp.ts` and `src/lib/trends.ts` for logging failures
## Logging
- `console.error("NLP analysis failed:", error)` in `src/lib/nlp.ts`
- `console.error("Google Trends failed:", error)` in `src/lib/trends.ts`
- No structured logging; no log levels beyond error
## Comments
- Brief inline comments for non-obvious logic: `// Strip all Codex-related env vars so the subprocess doesn't think it's nested`
- Section dividers in JSX: `{/* Background gradient blobs */}`, `{/* Progress steps */}`
- JSDoc only on `src/lib/scraper-rapidapi.ts` (`scrapeWithRapidApi` and `parseResponse`)
- Single-line `//` comments preferred
- No TSDoc on most exported functions
- TODO/FIXME comments: none found
## Module Design
- One primary export per file (default export for components, named export for lib functions)
- `src/lib/types.ts` exports all interfaces (barrel-like, single file)
- Some files export both a default and named exports: `src/components/ApiKeyModal.tsx` exports `default ApiKeyModal` and named `getStoredApiKey`
- Consistent `{ success: boolean; data/report?: T; error?: string }` pattern across all API functions and routes
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single route (`/`) with state-machine driven UI rendering all views
- API routes handle data scraping, enrichment, and AI analysis on the server
- Multi-strategy scraping with ordered fallback chains (different for local vs Vercel)
- Two AI backends: Codex CLI (local) and Anthropic HTTP API (deployed/API key)
- No database; all persistence is browser-side localStorage
## Layers
- Purpose: Renders all UI states and handles user interaction
- Location: `src/app/page.tsx`, `src/components/`
- Contains: A single page component with state machine, plus presentational sub-components
- Depends on: `src/lib/types.ts` for type definitions, `src/lib/report-history.ts` for localStorage persistence
- Used by: End users via browser
- Purpose: Orchestrates scraping, enrichment, and AI analysis
- Location: `src/app/api/`
- Contains: Three route handlers (`analyze`, `health`, `insta-login`)
- Depends on: All `src/lib/` modules
- Used by: Presentation layer via `fetch()`
- Purpose: Fetches Instagram profile data from multiple sources
- Location: `src/lib/instagram.ts`, `src/lib/scraper-puppeteer.ts`, `src/lib/instaloader.ts`, `src/lib/scraper-rapidapi.ts`
- Contains: Four independent scraper implementations with a common return shape
- Depends on: External APIs and tools (Instagram web API, Puppeteer/Chrome, Python/Instaloader, RapidAPI)
- Used by: `src/app/api/analyze/route.ts`
- Purpose: Adds NLP and trend data to scraped profile data before AI analysis
- Location: `src/lib/nlp.ts`, `src/lib/trends.ts`
- Contains: Caption NLP analysis (TF-IDF, sentiment) and Google Trends direction
- Depends on: `natural` (NLP library), `google-trends-api`
- Used by: `src/app/api/analyze/route.ts`
- Purpose: Sends profile + enrichment data to Codex for strategic analysis
- Location: `src/lib/Codex-api.ts`, `src/lib/Codex-cli.ts`, `src/lib/prompt.ts`
- Contains: Prompt builder, two Codex invocation strategies (HTTP API, CLI subprocess)
- Depends on: `@anthropic-ai/sdk`, Codex CLI binary
- Used by: `src/app/api/analyze/route.ts`
- Purpose: Cross-cutting concerns (rate limiting, health checks)
- Location: `src/lib/rate-limit.ts`, `src/app/api/health/route.ts`
- Contains: In-memory IP-based rate limiter, CLI/environment health checker
- Depends on: Nothing external
- Used by: `src/app/api/analyze/route.ts`, `src/app/page.tsx` (health check)
## Data Flow
- All UI state lives in `src/app/page.tsx` via `useState` hooks
- App state is modeled as a finite state machine with `AppState` type: `"checking" | "healthy" | "unhealthy" | "input" | "manual" | "loading" | "report" | "error"`
- API key stored in `localStorage` under key `anthropic_api_key`
- Report history stored in `localStorage` under key `sociallens_reports` (last 20 reports)
- No global state library (Redux, Zustand, etc.) is used
## Key Abstractions
- Purpose: Uniform return type for all four scraping strategies
- Shape: `{ success: boolean; profile?: InstagramProfile; error?: string }`
- Implementations: `src/lib/instagram.ts`, `src/lib/scraper-puppeteer.ts`, `src/lib/instaloader.ts`, `src/lib/scraper-rapidapi.ts`
- Pattern: Strategy pattern with ordered fallback chain in the route handler
- Purpose: Uniform return type for both Codex invocation methods
- Shape: `{ success: boolean; report?: AnalysisReport; error?: string }`
- Implementations: `src/lib/Codex-api.ts` (`analyzeWithApi`), `src/lib/Codex-cli.ts` (`analyzeProfile`)
- Pattern: Strategy pattern; API key presence determines which is used
- Purpose: The central domain type representing a complete profile analysis
- Definition: `src/lib/types.ts` (lines 141-175)
- Contains: 14 top-level fields covering scores, engagement, content strategy, roadmap, monetisation, NLP, and trends
- Generated by: Codex AI, parsed from JSON response
- Consumed by: `src/components/ReportDashboard.tsx`
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Renders all UI states, handles form submissions, manages app state
- Location: `src/app/api/analyze/route.ts`
- Triggers: POST from client with `{ username }` or `{ manualData }`
- Responsibilities: Orchestrates the full scrape -> enrich -> analyze pipeline
- Location: `src/app/api/health/route.ts`
- Triggers: GET from client on page load (when no API key stored)
- Responsibilities: Reports environment capabilities (CLI, Vercel, server API key)
- Location: `src/app/api/insta-login/route.ts`
- Triggers: POST with Instagram credentials
- Responsibilities: Runs Python/Instaloader login to save session for authenticated scraping
## Error Handling
- Scraper cascade: each scraper catches its own errors and returns `{ success: false, error }`. The route handler tries the next scraper in sequence.
- AI analysis: catches specific error types (auth, rate limit, JSON parse) and returns targeted error messages
- Client: displays error state with "Try Again" button; specific scrape failures trigger manual entry fallback
- Rate limiting: in-memory sliding window (5 requests/hour per IP) returns HTTP 429
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-Codex-profile` -- do not edit manually.
<!-- GSD:profile-end -->
