# Roadmap: InstaAnalyse

## Overview

InstaAnalyse evolves from a stateless single-page Instagram analyzer into a multi-tenant SaaS with user accounts, six social platforms, AI-powered multi-agent analysis, dual-market payments, and a growth tracking dashboard. The build order is dependency-driven: auth and the database schema are the hard prerequisite for every other feature, platform scrapers must exist behind a registry before new platforms can be added, payments must be live before expensive AI features are unlocked, and the multi-agent AI layer lands last so it enhances a product that already earns revenue.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, database schema, scraper registry, and infrastructure baseline
- [ ] **Phase 2: Platform Expansion** - Twitter/X, TikTok, YouTube, LinkedIn, and Facebook scrapers
- [x] **Phase 3: Payments and Gating** - Razorpay subscriptions, freemium enforcement, and subscription state (completed 2026-03-31)
- [ ] **Phase 4: AI Enhancement** - Multi-agent analysis, competitor comparison, content calendar, hashtag strategy
- [ ] **Phase 5: Growth Tracking and Dashboard** - Report persistence, metric trends, user dashboard, account management

## Phase Details

### Phase 1: Foundation
**Goal**: Users can authenticate, and every subsequent feature has a safe, persistent, and rate-limited surface to build on
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password, receive a verification email, and complete signup
  2. User can sign in with Google OAuth and stay signed in across browser refresh
  3. User can reset a forgotten password and log out from any page
  4. All user-facing Supabase tables have Row Level Security enforced — no user can read or write another user's data
  5. The existing Instagram analysis pipeline runs through the new scraper registry adapter and the in-memory rate limiter is gone — usage is enforced atomically against the database
**Plans**: 7 plans
**UI hint**: yes

Plans:
- [x] 01-00-PLAN.md — Test scaffold: vitest config and src/__tests__/ directory
- [x] 01-01-PLAN.md — Infra upgrade: Next.js 16.2.1, @tesserix/web private registry, dark theme CSS
- [x] 01-02-PLAN.md — Supabase schema: 4 tables + RLS + trigger + check_and_increment_usage RPC
- [x] 01-03-PLAN.md — Auth layer: Supabase client factories, proxy.ts (Next.js 16), OAuth callback
- [x] 01-04-PLAN.md — Page structure: landing, login, signup, dashboard, analyze (stub), reports, settings + nav
- [x] 01-05-PLAN.md — Scraper registry + analyze route: PlatformScraper, auth check, usage RPC, BYOK removal
- [ ] 01-06-PLAN.md — Human verification: full auth flow, session persistence, usage enforcement

### Phase 2: Platform Expansion
**Goal**: Users can analyze profiles on Twitter/X, TikTok, YouTube, LinkedIn, and Facebook using the same analysis pipeline that powers Instagram
**Depends on**: Phase 1
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, PLAT-07
**Success Criteria** (what must be TRUE):
  1. User can select Twitter/X, TikTok, or YouTube and receive a complete AI analysis report with the same quality as Instagram
  2. User can select LinkedIn or Facebook and receive an AI analysis report, falling back to manual data entry when scraping is unavailable — manual entry is a first-class UX path, not a degraded error state
  3. Every platform adapter returns data in a normalized shape that the existing analysis pipeline accepts without modification
  4. A platform health indicator is visible before the user starts an analysis — if a scraper is known-down, the user sees it before committing to the flow
**Plans**: 7 plans

Plans:
- [x] 02-01-PLAN.md — Type contracts: NormalizedProfile discriminated union + InstagramProfile platform discriminant
- [x] 02-02-PLAN.md — YouTube scraper: googleapis channels.list + ScrapeCreators quota fallback
- [x] 02-03-PLAN.md — ScrapeCreators scrapers: Twitter, TikTok, LinkedIn, Facebook with Zod validation
- [x] 02-04-PLAN.md — Registry + prompts: register all 6 scrapers, per-platform AI prompt builders
- [x] 02-05-PLAN.md — Platform health: Supabase migration, cron canary, GET /api/platform-health
- [x] 02-06-PLAN.md — Platform card UI: PlatformGrid, PlatformCard, 2-step analyze flow
- [ ] 02-07-PLAN.md — Human verification: end-to-end flow across all 6 platforms

### Phase 3: Payments and Gating
**Goal**: Users can subscribe via Razorpay (global), and the freemium tier limit is reliably enforced against subscription state
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-03, PAY-04, PAY-05, PAY-06
**Success Criteria** (what must be TRUE):
  1. User can complete a Razorpay subscription checkout (UPI, cards, wallets) and gain immediate Pro access after webhook confirmation
  2. A free-tier user who has used 3 analyses in the current month sees an inline upgrade prompt and cannot run a fourth analysis until the month resets or they subscribe
  3. Subscription cancellation, renewal, and payment failure events update the user's access state within the same webhook delivery — client-side payment callbacks never modify subscription state
  4. User can see their current plan, remaining free analyses, and cancel their subscription from the Settings page
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md — Razorpay SDK singleton + webhook types + REQUIREMENTS.md fix
- [x] 03-02-PLAN.md — Schema migration (processed_webhook_events) + plan-aware analyze route
- [x] 03-03-PLAN.md — Checkout API route + webhook handler with idempotency
- [x] 03-04-PLAN.md — UpgradePrompt component (inline Razorpay popup)
- [x] 03-05-PLAN.md — BillingSection + CancelDialog + Settings page wiring
- [x] 03-06-PLAN.md — Wire UpgradePrompt into analyze page on limit hit

### Phase 4: AI Enhancement
**Goal**: Paid users receive substantially richer analysis through multi-agent debate and synthesis, and all users gain competitor comparison, content calendar, and hashtag strategy features
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06
**Success Criteria** (what must be TRUE):
  1. A Pro user running an analysis sees a report generated by three independent Claude agents followed by a synthesis — the report is visibly richer than the single-agent equivalent
  2. A free-tier user receives a single-agent analysis report (not an error or degraded experience)
  3. User can run a competitor comparison between 2 to 3 profiles on the same platform and see a side-by-side AI report
  4. User can request an AI-generated 30-day content calendar for any analyzed profile
  5. User can request hashtag strategy recommendations for any analyzed profile, identifying niche and oversaturated tags
  6. Running the same profile analysis twice within one hour returns a cached result — no duplicate AI API cost
**Plans**: 7 plans

Plans:
- [x] 04-01-PLAN.md — Type contracts: 8 new types (CalendarEntry, CalendarWeek, ContentCalendarReport, CompetitorMetricRow, CompetitorComparisonReport, HashtagCategory, HashtagStrategyReport, MultiAgentMetadata) + schema report_type column
- [x] 04-02-PLAN.md — Test scaffolds: 5 test files covering AI-01 through AI-06 (Wave 0, RED state)
- [x] 04-03-PLAN.md — Multi-agent AI layer: OpenRouter client, 3 provider wrappers (Claude Haiku, GPT-4o-mini, Gemini Flash), orchestrator (Promise.allSettled), synthesizer (Claude Sonnet)
- [x] 04-04-PLAN.md — Analyze route extension: 1-hour Supabase cache + Pro/Free branch to multi-agent vs single-agent
- [x] 04-05-PLAN.md — New API routes: /api/compare, /api/calendar, /api/hashtags + prompt builders in prompt.ts
- [x] 04-06-PLAN.md — UI: CompetitorComparison, ContentCalendar, HashtagStrategy components + ReportDashboard tab wiring
- [ ] 04-07-PLAN.md — Human verification: multi-agent quality, cache behavior, all 3 new features end-to-end

### Phase 5: Growth Tracking and Dashboard
**Goal**: Users have a persistent home base showing their saved reports, account controls, and metric trends over time for tracked profiles
**Depends on**: Phase 4
**Requirements**: GROW-01, GROW-02, GROW-03, GROW-04, DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. After completing an analysis, user can save the report to their account and find it again on future sessions
  2. User can view a chronological list of past reports for any previously analyzed profile handle
  3. User dashboard shows follower count, engagement rate, and posting frequency trends as visual charts across saved reports
  4. User can filter saved reports by platform and date on the report history page
  5. User can update their email, password, and manage their subscription from the account settings page
**Plans**: 8 plans
**UI hint**: yes

Plans:
- [x] 05-01-PLAN.md — Wave 0: install recharts + @supabase/ssr, schema migrations, chart-data.ts, RED test scaffolds
- [x] 05-02-PLAN.md — GET /api/reports: paginated, filtered reports API (platform, search, page)
- [x] 05-03-PLAN.md — PATCH /api/profile: display name and avatar URL update endpoint
- [x] 05-04-PLAN.md — Dashboard page rewrite: StatsCards, ActivityFeed, live Supabase data
- [x] 05-05-PLAN.md — Reports page rewrite: ReportCard grid, ReportFilters, Pagination
- [x] 05-06-PLAN.md — GrowthChart component (Recharts AreaChart) + dashboard chart wiring
- [x] 05-07-PLAN.md — ProfileEditSection (display name + avatar upload) + CompetitorComparison saved-reports toggle
- [ ] 05-08-PLAN.md — Human verification: dashboard, reports, charts, settings, competitor compare

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 6/7 | In Progress|  |
| 2. Platform Expansion | 6/7 | In Progress|  |
| 3. Payments and Gating | 6/6 | Complete   | 2026-03-31 |
| 4. AI Enhancement | 3/7 | In Progress|  |
| 5. Growth Tracking and Dashboard | 7/8 | In Progress|  |
