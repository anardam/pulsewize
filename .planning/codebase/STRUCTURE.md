# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
InstaAnalyse/
├── src/
│   ├── app/                    # Next.js App Router (pages + API routes)
│   │   ├── api/                # Server-side API route handlers
│   │   │   ├── analyze/        # POST - Main analysis orchestration
│   │   │   │   └── route.ts
│   │   │   ├── health/         # GET - Environment health check
│   │   │   │   └── route.ts
│   │   │   └── insta-login/    # POST - Instagram session login via Instaloader
│   │   │       └── route.ts
│   │   ├── fonts/              # Local font files (Geist Sans & Mono)
│   │   │   ├── GeistVF.woff
│   │   │   └── GeistMonoVF.woff
│   │   ├── favicon.ico
│   │   ├── globals.css         # Global styles (Tailwind base + custom classes)
│   │   ├── layout.tsx          # Root layout (dark theme, fonts, metadata)
│   │   └── page.tsx            # Single page: state machine rendering all views
│   ├── components/             # Client-side React components
│   │   ├── ApiKeyModal.tsx     # Modal for entering/storing Anthropic API key
│   │   ├── HealthError.tsx     # Error display for health check failures
│   │   ├── LoadingScreen.tsx   # Animated loading with step-by-step messages
│   │   ├── ManualEntryForm.tsx # Form for manual Instagram profile data entry
│   │   └── ReportDashboard.tsx # Full analysis report display (largest component)
│   ├── lib/                    # Server-side utilities and business logic
│   │   ├── claude-api.ts       # Anthropic HTTP SDK analysis (deployed/API key path)
│   │   ├── claude-cli.ts       # Claude Code CLI subprocess analysis (local path)
│   │   ├── instagram.ts        # Instagram public web API scraper
│   │   ├── instaloader.ts      # Python Instaloader subprocess scraper
│   │   ├── nlp.ts              # Caption NLP (TF-IDF keywords, sentiment analysis)
│   │   ├── prompt.ts           # Prompt builder for Claude analysis
│   │   ├── rate-limit.ts       # In-memory IP-based rate limiter
│   │   ├── report-history.ts   # localStorage-based report history (client-side)
│   │   ├── scraper-puppeteer.ts # Headless Chrome/Puppeteer scraper
│   │   ├── scraper-rapidapi.ts  # RapidAPI Instagram scraper (multi-provider)
│   │   ├── trends.ts           # Google Trends interest-over-time lookup
│   │   └── types.ts            # All TypeScript interfaces (shared types)
│   └── types/                  # Type declaration files for untyped packages
│       ├── google-trends-api.d.ts
│       └── html2pdf.d.ts
├── .eslintrc.json              # ESLint config (extends next/core-web-vitals)
├── .gitignore
├── next.config.mjs             # Next.js config (minimal)
├── package.json
├── package-lock.json
├── postcss.config.mjs          # PostCSS config for Tailwind
├── tailwind.config.ts          # Tailwind config with custom gradient animation
├── tsconfig.json               # TypeScript config with @/ path alias
└── README.md
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router root; contains the single page and all API routes
- Contains: Root layout, single page component, API route handlers, fonts, global CSS
- Key files: `page.tsx` (entire frontend), `layout.tsx` (root HTML shell)

**`src/app/api/`:**
- Purpose: Server-side API endpoints (Next.js Route Handlers)
- Contains: Three route directories following Next.js `route.ts` convention
- Key files: `analyze/route.ts` (core pipeline), `health/route.ts` (env detection)

**`src/components/`:**
- Purpose: Reusable client-side React components
- Contains: All "use client" components extracted from the main page
- Key files: `ReportDashboard.tsx` (largest file, renders full analysis report)

**`src/lib/`:**
- Purpose: Shared business logic and utilities
- Contains: Scrapers, AI clients, NLP, trends, prompt builder, rate limiter, types
- Key files: `types.ts` (all domain interfaces), `prompt.ts` (Claude prompt template)

**`src/types/`:**
- Purpose: TypeScript declaration files for packages without types
- Contains: Ambient module declarations for `google-trends-api` and `html2pdf.js`

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: The entire frontend application (single page, state machine)
- `src/app/layout.tsx`: Root HTML layout with dark theme and Geist fonts
- `src/app/api/analyze/route.ts`: Main backend orchestrator (scrape -> enrich -> analyze)

**Configuration:**
- `next.config.mjs`: Minimal Next.js config
- `tailwind.config.ts`: Custom Tailwind theme with gradient animation keyframes
- `tsconfig.json`: TypeScript config with `@/*` path alias mapped to `./src/*`
- `postcss.config.mjs`: PostCSS with Tailwind plugin

**Core Logic:**
- `src/lib/prompt.ts`: The Claude prompt template that defines the entire analysis output schema
- `src/lib/claude-api.ts`: Anthropic SDK integration for deployed environments
- `src/lib/claude-cli.ts`: Claude Code CLI subprocess for local development
- `src/lib/instagram.ts`: Instagram public web API scraper
- `src/lib/scraper-rapidapi.ts`: RapidAPI multi-provider Instagram scraper
- `src/lib/scraper-puppeteer.ts`: Headless Chrome scraper with Vercel/local detection
- `src/lib/instaloader.ts`: Python subprocess scraper using Instaloader library
- `src/lib/nlp.ts`: TF-IDF keyword extraction and AFINN sentiment analysis
- `src/lib/trends.ts`: Google Trends 90-day interest lookup

**Shared Types:**
- `src/lib/types.ts`: All domain interfaces (`InstagramProfile`, `AnalysisReport`, `ManualProfileInput`, etc.)

**Testing:**
- No test files exist in the project

## Naming Conventions

**Files:**
- kebab-case for all source files: `claude-api.ts`, `scraper-rapidapi.ts`, `rate-limit.ts`
- PascalCase for React components: `ReportDashboard.tsx`, `ApiKeyModal.tsx`, `LoadingScreen.tsx`
- Route handler files always named `route.ts` (Next.js convention)

**Directories:**
- kebab-case for API route segments: `api/analyze/`, `api/health/`, `api/insta-login/`
- lowercase for structural directories: `src/`, `lib/`, `components/`, `types/`, `fonts/`

## Routing Structure

**Pages:**
- `/` - Single page (`src/app/page.tsx`) - all UI states rendered by state machine

**API Routes:**
- `POST /api/analyze` - Main analysis endpoint (`src/app/api/analyze/route.ts`)
- `GET /api/health` - Environment health check (`src/app/api/health/route.ts`)
- `POST /api/insta-login` - Instagram session login (`src/app/api/insta-login/route.ts`)

## Where to Add New Code

**New Scraper Strategy:**
- Create `src/lib/scraper-{name}.ts` following the existing pattern: export a function returning `Promise<{ success: boolean; profile?: InstagramProfile; error?: string }>`
- Add it to the fallback chain in `src/app/api/analyze/route.ts` (separate chains for Vercel vs local)

**New Enrichment Module:**
- Create `src/lib/{name}.ts` with its own result interface
- Import and call from `src/app/api/analyze/route.ts` in the `Promise.all` enrichment block
- Attach result to the report object before returning

**New UI Component:**
- Create `src/components/{ComponentName}.tsx` with `"use client"` directive
- Import and render from `src/app/page.tsx` in the appropriate state branch

**New API Route:**
- Create `src/app/api/{route-name}/route.ts` exporting named HTTP method handlers (GET, POST, etc.)

**New Shared Types:**
- Add interfaces to `src/lib/types.ts`

**New Type Declarations:**
- Add `.d.ts` files to `src/types/`

## Special Directories

**`src/app/fonts/`:**
- Purpose: Local Geist font files loaded via `next/font/local`
- Generated: No (committed static assets)
- Committed: Yes

**`.planning/`:**
- Purpose: Project planning and analysis documentation
- Generated: By tooling
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `next build` / `next dev`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-03-31*
