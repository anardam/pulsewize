# InstaAnalyse

## What This Is

A multi-platform social media analyzer that uses Anthropic Claude AI to generate deep growth strategies, content calendars, hashtag strategies, and competitor comparisons across Instagram, Twitter/X, TikTok, YouTube, LinkedIn, and Facebook. Users sign up, analyze profiles, track growth over time, and subscribe for premium features.

## Core Value

AI-powered social media analysis that gives creators and businesses actionable growth strategies — the analysis quality and actionability of reports is the ONE thing that must work.

## Requirements

### Validated

- ✓ Instagram profile scraping via multiple fallback strategies — existing
- ✓ Claude AI-powered profile analysis with growth strategy reports — existing
- ✓ NLP enrichment (TF-IDF keywords, sentiment analysis on captions) — existing
- ✓ Google Trends integration for niche trend direction — existing
- ✓ PDF report export — existing
- ✓ Report history via localStorage — existing
- ✓ Manual data entry fallback when scraping fails — existing
- ✓ Multi-environment scraping (Vercel vs local strategies) — existing
- ✓ User authentication via email/password and Google OAuth (Supabase Auth) — Phase 1
- ✓ Supabase database with RLS, usage RPC, auto-provisioning trigger — Phase 1
- ✓ Platform-agnostic scraper registry with adapter pattern — Phase 1
- ✓ Next.js 16 + React 19 upgrade — Phase 1
- ✓ SaaS page structure (landing, auth, dashboard, analyze, reports, settings) — Phase 1

### Active

- [x] User authentication (Google OAuth + email/password via Supabase) — validated Phase 1
- [x] Supabase database for user data, reports, and subscription state — validated Phase 1
- [x] Twitter/X profile scraping and analysis — validated Phase 2
- [x] TikTok profile scraping and analysis — validated Phase 2
- [x] YouTube channel scraping and analysis — validated Phase 2
- [x] LinkedIn profile scraping and analysis — validated Phase 2
- [x] Facebook page scraping and analysis — validated Phase 2
- [x] Razorpay subscription payments (global) — validated Phase 3
- [x] Freemium gating (3 free analyses/month, atomic enforcement) — validated Phase 3
- [x] Billing UI (plan, usage, invoices, cancel) on Settings page — validated Phase 3
- [ ] Twitter/X profile scraping and analysis
- [ ] TikTok profile scraping and analysis
- [ ] YouTube channel scraping and analysis
- [ ] LinkedIn profile scraping and analysis
- [ ] Facebook page scraping and analysis
- [ ] Competitor comparison (side-by-side analysis of multiple profiles)
- [ ] AI-generated content calendar with optimal posting times
- [ ] Hashtag strategy recommendations based on niche and engagement
- [ ] Growth tracking dashboard (saved reports, metric trends over time)
- [ ] Freemium subscription model (3 free analyses/month)
- [ ] Stripe payment integration for international subscriptions
- [ ] Razorpay payment integration for India-based subscriptions
- [ ] User dashboard with saved reports and account management
- [ ] Multi-agent analysis (multiple Claude agents independently analyze, then debate/synthesize diverse perspectives into richer reports)

### Out of Scope

- Mobile app — focus on web-first, revisit after v1 traction
- Social media posting/scheduling — analysis only, not a management tool
- Real-time monitoring/alerts — batch analysis, not live tracking
- Team/agency features — single-user focus for v1
- White-label/API access — direct consumer product first

## Context

- **Existing codebase:** Next.js 14 App Router with TypeScript, Tailwind CSS, deployed on Vercel
- **AI backbone:** Anthropic Claude (claude-sonnet-4-20250514) via @anthropic-ai/sdk, with CLI fallback for local dev
- **Scraping:** 4-strategy cascade (RapidAPI, Instagram public API, Puppeteer, Instaloader) — needs similar multi-strategy approach for new platforms
- **Current state:** Single-page app with state-machine UI, no database, no auth — needs significant architecture evolution
- **No tests:** Zero test coverage currently — testing should be added as part of the expansion

## Constraints

- **Platform**: Vercel deployment — serverless function limits (10s default, 60s pro), no persistent processes
- **AI Cost**: Claude API calls are the primary cost driver — need usage limits per tier
- **Scraping**: Social platform APIs are unreliable/rate-limited — need multiple fallback strategies per platform
- **Budget**: Freemium model means costs must be controlled before revenue — Supabase free tier, careful API usage
- **UI Design**: Modern, clean aesthetic — minimal, polished pages throughout the app
- **Payments**: Dual payment provider (Stripe + Razorpay) adds complexity but enables global reach

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + database | Free tier, built-in auth, Postgres, easy Next.js integration | — Pending |
| Stripe + Razorpay dual payments | Global reach (Stripe) + India market (Razorpay) | — Pending |
| Anthropic Claude as sole AI | Already integrated, high-quality analysis output | — Pending |
| Keep Vercel deployment | Already working, good DX, serverless scales with usage | — Pending |
| Freemium with 3 free/month | Low barrier to entry, converts engaged users | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after Phase 3 completion*
