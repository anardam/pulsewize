# Phase 1: Foundation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver user authentication (email/password + Google OAuth via Supabase), the database schema for users/reports/subscriptions/usage, a platform-agnostic scraper registry that abstracts existing Instagram scrapers, upgrade all packages to latest (including Next.js 16.2.1), and replace the in-memory rate limiter with atomic Supabase RPC-based usage enforcement. The existing Instagram analysis pipeline must continue working through the new scraper registry.

</domain>

<decisions>
## Implementation Decisions

### Auth UI Flow
- **D-01:** Dedicated `/login` and `/signup` pages — clean standalone pages, not modals or inline forms
- **D-02:** Landing/marketing page at `/` for unauthenticated users — hero section, features list, pricing preview, CTA to signup
- **D-03:** After login, redirect to Dashboard (`/dashboard`) as the authenticated home

### App Navigation
- **D-04:** Top navbar with logo, page links, and user avatar/dropdown menu — standard SaaS pattern
- **D-05:** Four main pages after auth: Dashboard (`/dashboard`), Analyze (`/analyze`), Reports (`/reports`), Settings (`/settings`)
- **D-06:** The current single-page state machine in `page.tsx` gets refactored into the `/analyze` route

### User Profile Data
- **D-07:** Minimal signup — just email + password or Google OAuth. Display name auto-derived from email. No avatar, bio, or social handles at signup.
- **D-08:** Dark theme only — keep current dark aesthetic, no light mode toggle

### Data Migration
- **D-09:** Start fresh — new accounts begin with empty report history. localStorage reports are not migrated. Simplest approach.
- **D-10:** Remove BYOK (bring your own API key) — all analysis uses server-side `ANTHROPIC_API_KEY`. Required for freemium usage tracking. Remove `ApiKeyModal` component and client-provided API key header logic.

### Database Schema
- **D-11:** Supabase Postgres with RLS on all user-facing tables
- **D-12:** Core tables: `profiles` (user profile data), `reports` (saved analysis reports), `subscriptions` (payment/plan state), `usage` (monthly analysis counts)
- **D-13:** Atomic usage enforcement via Supabase RPC function `check_and_increment_usage()` — replaces in-memory `rate-limit.ts`

### Scraper Registry
- **D-14:** Abstract existing Instagram scrapers behind a `PlatformScraper` interface/adapter pattern
- **D-15:** Registry maps platform names to scraper implementations — new platforms (Phase 2) slot in without changing the analyze route

### Claude's Discretion
- Supabase schema details (column types, indexes, RLS policy specifics)
- Middleware implementation pattern for auth protection
- Landing page layout and content specifics (follow modern SaaS conventions)
- Next.js 15 migration specifics (App Router changes, breaking changes handling)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, requirements, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements with REQ-IDs (INFRA-01..04, AUTH-01..07 for this phase)
- `.planning/ROADMAP.md` — Phase dependencies and success criteria

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Current architecture (single-page state machine, API routes, scraping layers)
- `.planning/codebase/STACK.md` — Current tech stack with versions
- `.planning/codebase/STRUCTURE.md` — Directory layout and file responsibilities
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style, TypeScript config
- `.planning/codebase/CONCERNS.md` — Known issues and tech debt

### Research
- `.planning/research/STACK.md` — Recommended stack additions (Supabase SSR, scraper APIs)
- `.planning/research/ARCHITECTURE.md` — Target architecture with adapter pattern, auth flow
- `.planning/research/PITFALLS.md` — Critical pitfalls (RLS bypass, rate-limit race condition, getUser vs getSession)
- `.planning/research/SUMMARY.md` — Research synthesis

### Key Source Files (to understand before modifying)
- `src/app/page.tsx` — Current single-page state machine (will be refactored into /analyze route)
- `src/app/api/analyze/route.ts` — Main analysis orchestration (scraper cascade, enrichment, AI call)
- `src/lib/rate-limit.ts` — In-memory rate limiter (to be replaced)
- `src/lib/types.ts` — All TypeScript interfaces (shared types)
- `src/components/ApiKeyModal.tsx` — BYOK modal (to be removed)
- `src/lib/claude-api.ts` — Anthropic SDK integration (keep, but remove client-provided key path)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ReportDashboard.tsx` — Largest component, renders full analysis reports. Will be reused in /analyze and /reports pages.
- `src/components/LoadingScreen.tsx` — Animated loading with step messages. Reusable across pages.
- `src/components/ManualEntryForm.tsx` — Manual data entry form. Reusable in scraper fallback flow.
- `src/lib/claude-api.ts` — Anthropic SDK client. Core analysis engine, keep as-is minus BYOK.
- `src/lib/claude-cli.ts` — CLI fallback for local dev. Keep for development convenience.
- `src/lib/nlp.ts`, `src/lib/trends.ts` — Enrichment pipeline. Reusable as-is.
- `src/lib/prompt.ts` — Prompt builder. Reusable, will be extended for multi-platform in Phase 2.

### Established Patterns
- API routes follow `{ success: boolean; data?: T; error?: string }` envelope pattern
- PascalCase components, kebab-case lib files
- State machine pattern in page.tsx (will be simplified when refactored)
- Scraper cascade with ordered fallback (model for new platform adapters)

### Integration Points
- `src/app/layout.tsx` — Root layout needs Supabase provider, navbar, auth context
- `src/app/api/analyze/route.ts` — Needs auth middleware, usage check before analysis, scraper registry instead of direct scraper calls
- `package.json` — All dependencies need updating to latest

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants "modern, clean" pages throughout — this applies to landing, auth, dashboard, and all new pages
- Dark theme only (current aesthetic preserved)
- Full SaaS-style app with proper routing, not single-page feel

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-31*
