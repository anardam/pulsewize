# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `src/components/ReportDashboard.tsx`, `src/components/ApiKeyModal.tsx`)
- Library modules: kebab-case (e.g., `src/lib/claude-api.ts`, `src/lib/rate-limit.ts`, `src/lib/scraper-rapidapi.ts`)
- API routes: lowercase directory names following Next.js App Router convention (e.g., `src/app/api/analyze/route.ts`, `src/app/api/health/route.ts`)
- Type declaration files: kebab-case with `.d.ts` suffix (e.g., `src/types/google-trends-api.d.ts`)

**Functions:**
- Use camelCase for all functions: `analyzeProfile`, `checkRateLimit`, `scrapeWithRapidApi`, `buildAnalysisPrompt`
- Exported functions use descriptive verb-noun naming: `analyzeWithApi`, `scrapeInstagramProfile`, `getTrendDirection`
- Helper/private functions use shorter names: `parseResponse`, `extractPosts`, `asNumber`, `asString`, `cleanEnv`
- React event handlers prefixed with `handle`: `handleAnalyze`, `handleManualSubmit`, `handleApiKeyModalClose`

**Variables:**
- Use camelCase: `profileData`, `apiKey`, `scrapeError`, `lastError`
- Boolean variables use `is`/`has` prefix: `isVercel`, `hasApiKey`, `isPrivate`, `isVerified`
- Constants at module level use UPPER_SNAKE_CASE: `MAX_REQUESTS`, `WINDOW_MS`, `STORAGE_KEY`, `STEPS`

**Types:**
- Use `interface` for object shapes: `InstagramProfile`, `AnalysisReport`, `HealthCheckResponse`
- Use `type` for unions: `type AppState = "checking" | "healthy" | "unhealthy" | ...`
- Component props use `Props` as interface name (local to file): `interface Props { ... }`
- API response types follow `{ success: boolean; data?: T; error?: string }` envelope pattern

## Code Style

**Formatting:**
- No Prettier config file detected; relies on ESLint defaults
- Semicolons: always used
- Quotes: double quotes for strings
- Trailing commas: used in multi-line arrays/objects
- Indentation: 2 spaces

**Linting:**
- ESLint with `next/core-web-vitals` and `next/typescript` presets
- Config file: `.eslintrc.json`
- Run via: `npm run lint` (which runs `next lint`)

## TypeScript Configuration

**Strict mode:** Enabled (`"strict": true` in `tsconfig.json`)

**Key settings:**
- Module resolution: `bundler`
- JSX: `preserve` (Next.js handles transformation)
- Path alias: `@/*` maps to `./src/*`
- `skipLibCheck: true`
- `isolatedModules: true`

**Type patterns observed:**
- Explicit return types on exported async functions (e.g., `Promise<{ success: boolean; report?: AnalysisReport; error?: string }>`)
- Inline type annotations for request body parsing: `const { username, manualData } = body as { username?: string; manualData?: ManualProfileInput }`
- `Record<string, unknown>` used for untyped API response parsing in `src/lib/scraper-rapidapi.ts`
- Custom type declaration files for untyped packages in `src/types/`

## Import Organization

**Order (observed pattern):**
1. React/Next.js framework imports (`import { useState, useEffect } from "react"`, `import { NextRequest, NextResponse } from "next/server"`)
2. Third-party library imports (`import Anthropic from "@anthropic-ai/sdk"`, `import natural from "natural"`)
3. Internal imports using path alias (`import { AnalysisReport } from "@/lib/types"`, `import LoadingScreen from "@/components/LoadingScreen"`)

**Path Aliases:**
- `@/*` resolves to `./src/*` -- use this for all internal imports
- Never use relative paths like `../../lib/types`; always use `@/lib/types`

## CSS / Styling Approach

**Primary:** Tailwind CSS v3.4+ with utility-first approach
- All styling is inline Tailwind classes in JSX
- No CSS modules or styled-components
- Dark mode: hardcoded via `class="dark"` on `<html>` element (not togglable)

**Custom CSS:** Minimal, in `src/app/globals.css`
- `.gradient-text` -- gradient text effect (purple/pink/orange)
- `.card-glow` -- hover glow effect for cards
- `.animate-progress` -- progress bar animation
- Custom scrollbar styling (webkit)
- CSS variables: `--background` and `--foreground` (dark theme only)

**Custom Tailwind extensions** in `tailwind.config.ts`:
- `animate-pulse-slow` -- slower pulse animation
- `animate-gradient-x` -- horizontal gradient animation
- `colors.background` and `colors.foreground` mapped to CSS variables

**Color palette convention:**
- Background: `bg-gray-900/50`, `bg-gray-800/50`, `bg-[#0a0a0f]`
- Accent gradient: `from-purple-600 via-pink-600 to-orange-500`
- Text: `text-white`, `text-gray-400`, `text-gray-500` for muted
- Success: `text-green-400`, Error: `text-red-400`
- Use opacity suffixes: `bg-purple-500/10`, `bg-purple-500/20`

**Responsive pattern:**
- Mobile-first with `sm:` breakpoint overrides
- Example: `text-4xl sm:text-5xl`, `py-3.5 sm:py-4`, `gap-3 sm:gap-4`

## Component Patterns

**Structure:**
- All components are functional components using `export default function ComponentName`
- Client components marked with `"use client"` directive at top of file
- Server components: only `src/app/layout.tsx` (no directive)

**Props pattern:**
- Props defined as `interface Props` at the top of the file
- Destructured in function signature: `function Component({ prop1, prop2 }: Props)`
- No `React.FC` usage

**State management:**
- `useState` for local state; no global state library
- `localStorage` for persistence (API key, report history)
- No React Context providers

**Hooks usage:**
- `useState`, `useEffect`, `useRef`, `useCallback` from React
- No custom hooks defined
- `useEffect` for initialization logic (health checks, localStorage reads)

**Component composition:**
- Components defined inline within parent when small (e.g., `SettingsButton` and `ApiKeyBadge` in `src/app/page.tsx`)
- Larger components extracted to `src/components/`

## Error Handling

**API routes (`src/app/api/`):**
- Try-catch wrapping entire route handler
- `error instanceof Error ? error.message : "Unknown error occurred"` pattern for safe error extraction
- Return structured JSON: `{ success: false, error: "message" }` with appropriate HTTP status codes
- Specific error message matching for known error types (401, 429, JSON parse, timeout)

**Client-side:**
- Try-catch around `fetch` calls
- Error state managed via `useState`
- Generic fallback: `"Network error. Please try again."`
- Empty `catch {}` blocks (no error variable) used for non-critical failures

**Library functions (`src/lib/`):**
- Return `{ success: boolean; error?: string }` result objects instead of throwing
- Graceful degradation: scraper functions try multiple providers, falling through on failure
- `console.error` used in `src/lib/nlp.ts` and `src/lib/trends.ts` for logging failures

## Logging

**Framework:** `console.error` (no logging library)

**Patterns:**
- `console.error("NLP analysis failed:", error)` in `src/lib/nlp.ts`
- `console.error("Google Trends failed:", error)` in `src/lib/trends.ts`
- No structured logging; no log levels beyond error

## Comments

**When used:**
- Brief inline comments for non-obvious logic: `// Strip all Claude-related env vars so the subprocess doesn't think it's nested`
- Section dividers in JSX: `{/* Background gradient blobs */}`, `{/* Progress steps */}`
- JSDoc only on `src/lib/scraper-rapidapi.ts` (`scrapeWithRapidApi` and `parseResponse`)

**Style:**
- Single-line `//` comments preferred
- No TSDoc on most exported functions
- TODO/FIXME comments: none found

## Module Design

**Exports:**
- One primary export per file (default export for components, named export for lib functions)
- `src/lib/types.ts` exports all interfaces (barrel-like, single file)
- Some files export both a default and named exports: `src/components/ApiKeyModal.tsx` exports `default ApiKeyModal` and named `getStoredApiKey`

**API response envelope:**
- Consistent `{ success: boolean; data/report?: T; error?: string }` pattern across all API functions and routes

---

*Convention analysis: 2026-03-31*
