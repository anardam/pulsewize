# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript ^5 - All application code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- Python 3 - Inline scripts for Instaloader scraping (`src/lib/instaloader.ts`, `src/app/api/insta-login/route.ts`)
- CSS - Global styles with Tailwind (`src/app/globals.css`)

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` present)
- Python 3 (required for Instaloader scraping, resolved via project `.venv/bin/python3` or system `python3`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 14.2.35 - Full-stack React framework (App Router)
- React ^18 - UI library
- React DOM ^18 - DOM rendering

**Testing:**
- None configured (no test framework, no test config files, no test files)

**Build/Dev:**
- Next.js built-in bundler (Turbopack/Webpack)
- TypeScript ^5 - Type checking
- ESLint ^8 with `eslint-config-next` 14.2.35 - Linting
- PostCSS ^8 - CSS processing (`postcss.config.mjs`)
- Tailwind CSS ^3.4.1 - Utility-first CSS (`tailwind.config.ts`)

## Key Dependencies

**Critical:**
- `@anthropic-ai/sdk` ^0.80.0 - Anthropic Claude API client for AI-powered profile analysis (`src/lib/claude-api.ts`)
- `puppeteer-core` ^24.40.0 - Headless browser scraping of Instagram profiles (`src/lib/scraper-puppeteer.ts`)
- `@sparticuz/chromium` ^143.0.4 - Serverless-compatible Chromium binary for Puppeteer on Vercel (`src/lib/scraper-puppeteer.ts`)

**Infrastructure:**
- `natural` ^8.1.1 - NLP library for TF-IDF keyword extraction and sentiment analysis on captions (`src/lib/nlp.ts`)
- `google-trends-api` ^4.9.2 - Google Trends data for niche trend direction analysis (`src/lib/trends.ts`)
- `html2pdf.js` ^0.14.0 - Client-side PDF generation for report export (referenced in components)

**Type Definitions (devDependencies):**
- `@types/node` ^20
- `@types/react` ^18
- `@types/react-dom` ^18

**Custom Type Declarations:**
- `src/types/google-trends-api.d.ts` - Type declarations for `google-trends-api` package
- `src/types/html2pdf.d.ts` - Type declarations for `html2pdf.js` package

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Strict mode enabled
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./src/*`
- JSX: `preserve` (Next.js handles transformation)
- Incremental compilation enabled

**Tailwind CSS:**
- Config: `tailwind.config.ts`
- Dark mode: `class`-based
- Custom CSS variables for `background` and `foreground` colors
- Custom animations: `pulse-slow`, `gradient-x`
- Content paths: `src/pages/**`, `src/components/**`, `src/app/**`

**Next.js:**
- Config: `next.config.mjs` (empty/default configuration)

**ESLint:**
- Uses `eslint-config-next` (no custom `.eslintrc` file detected)

**Environment Variables (existence only, never read):**
- `ANTHROPIC_API_KEY` - Server-side Anthropic API key (optional; client can also provide via header)
- `RAPIDAPI_KEY` - RapidAPI key for Instagram scraping services
- `VERCEL` - Auto-set by Vercel deployment platform; controls scraping strategy

## Platform Requirements

**Development:**
- Node.js with npm
- Python 3 with `instaloader` package (optional, for local scraping)
- Google Chrome or Chromium installed locally (optional, for Puppeteer scraping)
- Claude Code CLI installed (optional, alternative to API key for analysis)

**Production (Vercel):**
- Vercel serverless functions
- `@sparticuz/chromium` provides Chromium in serverless (though Puppeteer is deprioritized on Vercel)
- `RAPIDAPI_KEY` recommended for reliable scraping on Vercel
- Either `ANTHROPIC_API_KEY` server env var or client-provided API key required

---

*Stack analysis: 2026-03-31*
