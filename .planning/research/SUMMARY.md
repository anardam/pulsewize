# Project Research Summary

**Project:** InstaAnalyse — Multi-Platform Social Media Analytics with AI
**Domain:** AI-powered social media analytics SaaS (freemium, Vercel-deployed)
**Researched:** 2026-03-31
**Confidence:** MEDIUM-HIGH

---

## Executive Summary

InstaAnalyse is expanding from a single-platform Instagram analyzer into a 6-platform SaaS product with multi-agent AI analysis, user authentication, report persistence, and dual-market payments (Stripe for global, Razorpay for India). The research confirms that the existing Next.js 14 + Anthropic Claude + Vercel stack is the correct foundation — no major stack changes are needed, but significant infrastructure must be added around it: Supabase Auth + PostgreSQL, a platform-agnostic scraper registry, atomic usage gating, and a multi-agent AI orchestrator. The critical insight is that auth and the database schema are a hard prerequisite for every other feature: growth tracking, report history, usage limits, competitor comparison, and payments all depend on user identity and persistent state.

The highest-risk areas are (1) function timeout on Vercel when combining multi-platform scraping with multi-agent AI calls — this requires a job-queue pattern before multi-platform launches, not after; (2) freemium limit enforcement — the current in-memory rate limiter provides zero production protection and must be replaced with an atomic PostgreSQL increment before any usage gating is shown to users; and (3) AI cost management — naive multi-agent debate can cost $0.50–$2.00 per analysis, which is unsustainable on a free tier without Haiku workers, token caps, and result caching. LinkedIn and Facebook scraping will be unreliable regardless of investment — plan for frequent manual-entry fallbacks on those platforms and do not over-engineer automation for them.

The recommended build order, grounded in both the architectural dependency graph and pitfall risk, is: auth + database schema first, then platform scraper infrastructure (with the adapter/registry pattern so new platforms slot in cleanly), then subscription + payments, then platform expansion (Instagram already done, add Twitter/X and TikTok next as the most reliable sources), then multi-agent AI, and finally secondary features (growth tracking, hashtag strategy, content calendar). This order ensures each phase is monetizable independently and avoids the pitfall of building expensive AI features before the revenue model is live.

---

## Key Findings

### Recommended Stack

The core stack (Next.js 14, TypeScript, Tailwind) is already correct and should not be changed. The primary additions are Supabase (`@supabase/supabase-js` + `@supabase/ssr` — note: `@supabase/auth-helpers-nextjs` is deprecated and must not be used) for auth and database, Stripe + Razorpay for dual-market payments, and Zod for schema validation on all scraped inputs. The Vercel AI SDK (`ai` ^6.0.141) should be used for streaming the final synthesis response; direct `@anthropic-ai/sdk` calls (via `Promise.all`) are used for the parallel multi-agent phase. YouTube is the only platform where the official API should be used as the primary data source; all others rely on a cascading fallback via ScrapeCreators (primary) + RapidAPI scrapers (fallback) + manual entry (last resort).

**Core technologies:**
- `@supabase/ssr` ^0.10.0: SSR-safe auth for Next.js App Router — required, replaces deprecated auth-helpers package
- `@supabase/supabase-js` ^2.100.1: Database client, Row Level Security enforces per-user data isolation
- `stripe` ^21.0.1: Global payment processing; use Stripe Checkout to avoid PCI scope
- `razorpay` ^2.9.6: India-market payments (UPI, domestic cards) — implement separately, do not abstract over Stripe
- `@anthropic-ai/sdk` ^0.80.0: Already integrated; parallel `Promise.all` calls for multi-agent, no Claude Agent SDK
- `ai` ^6.0.141 (Vercel AI SDK): Browser streaming of final synthesis response only
- `googleapis`: YouTube Data API v3 (only platform using official API as primary source)
- `zod` ^3.x: Schema validation for all scraped data — add immediately in Phase 1
- `vitest` ^2.x + Playwright: Testing stack (zero coverage currently; must be built in from the start)

**Critical version note:** Use `claude-sonnet-4-20250514` for synthesis; use Haiku 4.5 for worker agents to cut per-analysis AI cost by ~66%. Both model names should be environment variables, not hardcoded.

### Expected Features

The feature research confirms a clear dependency chain: auth enables everything. No growth tracking, no usage limits, no competitor comparison, and no report history is possible without user identity and database persistence.

**Must have (table stakes) — missing any causes users to choose Iconosquare/Sprout Social:**
- User authentication (Supabase Google OAuth + email) — prerequisite for everything else
- Multi-platform unified dashboard (minimum: Instagram, TikTok, YouTube at launch)
- Core engagement metrics per post (engagement rate, reach, views — Instagram shifted to views as primary metric in 2026)
- Historical trend charts (30/60/90-day follower and engagement trends) — requires persistent snapshots
- Competitor comparison (at least 2 profiles side-by-side) — highest complexity table-stakes feature
- Hashtag performance report (which hashtags drove reach, which are oversaturated)
- Report persistence (replace localStorage with Supabase) — required for returning users
- Freemium tier with clear limits (3 analyses/month free is the research-validated benchmark)
- PDF / shareable report export (already exists — maintain it)

**Should have (differentiators that justify charging $19–79/month):**
- Multi-agent AI debate + synthesis — no mainstream analytics tool does this; research-validated for reducing hallucination (MAD framework, ICLR 2025)
- AI content calendar (30-day, platform-specific cadence) — competitors schedule but don't strategize
- Niche hashtag discovery engine (AI-identified emerging tags, not just popular ones)
- Cross-platform growth correlation with prioritized investment recommendation
- Google Trends integration for niche context (already in codebase — surface prominently)
- Dual payment (Stripe + Razorpay) for India market — genuine geographic differentiator

**Defer to v2+:**
- Social media posting / scheduling (Hootsuite/Buffer territory, different product)
- Team / agency multi-seat collaboration (different market segment, different pricing motion)
- Real-time monitoring / alerts (incompatible with Vercel serverless architecture)
- Email delivery of scheduled reports (requires email infrastructure not in scope)
- Mobile app (web-first is correct for v1)
- White-label / API access (B2B play, premature)

**Freemium tier design (research-validated):**

| Tier | Limit | Price |
|------|-------|-------|
| Free | 3 analyses/month, 1 platform, no competitor comparison, no growth tracking | $0 |
| Pro | Unlimited analyses, 6 platforms, competitor comparison (3 competitors), growth tracking, multi-agent reports | ~$19–29/month |
| Business | Everything in Pro, up to 10 competitors, priority analysis | ~$49–79/month |

Do NOT gate AI report quality behind tiers — free users must experience the best analysis. Gate on quantity and advanced features only.

### Architecture Approach

The system transitions from a stateless single-page app to a proper multi-tenant SaaS with 8 distinct components. The dominant architectural pattern is the **Platform Adapter Registry**: each social platform is an independent module behind a `PlatformScraper` interface, plugged into a registry. The main analysis route never needs to change as new platforms are added. Vercel serverless constraints are the binding architectural constraint — no persistent processes, no in-memory shared state, 300s max function duration on Pro. The multi-agent AI orchestrator is structurally a 3-phase pipeline: parallel analysis (3 agents via `Promise.all`), one fixed debate round (also parallelized), then a synthesis call.

**Major components:**
1. **Auth Component** — Supabase SSR middleware; never use `getSession()` server-side, always `getUser()` which validates with Supabase Auth server
2. **Platform Scraper Registry** — Adapter pattern; `scrape(platform, handle)` hides all fallback logic; Instagram's 4-strategy cascade becomes the first adapter
3. **Enrichment Pipeline** — NLP (TF-IDF, existing) + Google Trends (existing) run in parallel via `Promise.all` before AI analysis
4. **Multi-Agent AI Orchestrator** — 3 specialist agents (Growth Strategist, Content Analyst, Monetisation Specialist) in parallel, 1 fixed debate round, 1 synthesis call; Haiku workers + Sonnet synthesizer; Pro tier only
5. **Usage Gating Layer** — Atomic PostgreSQL RPC (`check_and_increment_usage`) enforced before any scrape+AI pipeline runs; tier limits in code, not DB
6. **Subscription Component** — Stripe (global) + Razorpay (India) with a single `subscriptions` table; webhook signature validation is mandatory; idempotency table prevents duplicate event processing
7. **Report Persistence Component** — Supabase `reports` table with RLS; store report metadata in DB, full JSON in Supabase Storage to avoid hitting 500 MB free-tier DB limit
8. **Frontend Application Layer** — App Router routes: `/` (landing), `/dashboard` (protected Server Component), `/analyze` (protected Client Component), `/reports/[id]`, `/account`

**Supabase schema:** 4 tables — `profiles`, `subscriptions`, `usage_records` (atomic increment pattern), `reports` — all with RLS enabled.

### Critical Pitfalls

1. **Freemium limit race condition** — The current in-memory `Map`-based rate limiter resets on cold start and is not shared across serverless instances. Replace immediately with an atomic PostgreSQL `UPDATE ... WHERE analyses_used < limit RETURNING analyses_used` — if no row is returned, the request is denied. Never read-then-write in separate queries for limit enforcement.

2. **Supabase `service_role` key exposed client-side** — A CVE (CVE-2025-48757) affected 170+ production apps via AI-generated code that used `service_role` in client-accessible code. `service_role` bypasses all RLS. Rule: never put `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_` variable; never initialize a client-side Supabase client with it; enable RLS explicitly on every table (it is off by default).

3. **Vercel function timeout on multi-platform + multi-agent** — Four Claude calls (3 parallel + 1 synthesis) plus scraping can approach or exceed 300s on Pro. The debate round adds sequential latency. For multi-platform competitor comparison this is structurally impossible as a synchronous function. Adopt a job-queue pattern (Inngest recommended) before building multi-platform support — return a `jobId` immediately, process asynchronously, poll or use Supabase Realtime for status.

4. **Multi-agent token cost explosion** — Full conversation history passed to each agent compounds context growth. At Sonnet pricing ($3/$15/M tokens), a naive 3-agent debate can cost $0.50–$2.00 per analysis. Prevention: use Haiku 4.5 for worker agents (~66% cost reduction), hard `max_tokens` caps per agent (1500 tokens), summarized (not raw) debate outputs passed to subsequent agents, and result caching for identical profile+handle within 1 hour.

5. **Dual payment webhook state divergence** — Stripe or Razorpay webhooks can fail, replay after 24 hours, or arrive out of order. A cancelled subscription may never update the DB; a user who paid may be locked out. Prevention: store processed webhook event IDs in a `processed_webhooks` table with a unique constraint; check before acting; return 200 immediately if already processed. Never update subscription state from the client-side payment success callback — server-side webhooks only.

---

## Implications for Roadmap

The architecture research defines a clear dependency-driven build order. The feature research confirms no phase should ship without auth and the database schema in place. The pitfall research shows that the usage gating mechanism and webhook idempotency are highest-risk and must be built correctly the first time — retrofitting is expensive.

### Phase 1: Foundation — Auth, Database, and Infrastructure

**Rationale:** Auth is a prerequisite for every other feature. Nothing can be user-scoped, persisted, or gated without it. The database schema, RLS policies, and the scraper registry adapter abstraction must all exist before any expansion work begins. This is also the phase where the most severe pitfalls (service_role exposure, getSession misuse, in-memory rate limiter) must be eliminated.
**Delivers:** User login (Google OAuth + email), Supabase schema (profiles + subscriptions + usage_records + reports), RLS on all tables, platform scraper registry (Instagram as first adapter), atomic usage gating, zod validation on all scraped inputs, replace in-memory rate limiter, remove client-side API key flow, initial routing structure (`/dashboard`, `/analyze`, `/reports/[id]`, `/account`, `/login`).
**Addresses:** User authentication, report persistence (localStorage → Supabase), freemium tier scaffolding.
**Avoids:** Pitfalls 1 (race condition), 2 (service_role exposure), 8 (OAuth session flicker).
**Research flag:** Standard patterns — Supabase SSR auth is well-documented; use official docs and `@supabase/ssr` exactly. No additional research needed.

### Phase 2: Platform Expansion — Twitter/X, TikTok, YouTube

**Rationale:** Platform expansion is independently addable once the scraper registry exists. Twitter/X, TikTok, and YouTube are the highest-confidence platforms (ScrapeCreators APIs are stable; YouTube uses official API). Adding these three first delivers the "multi-platform" value proposition before tackling harder platforms. Each platform can ship independently — one adapter at a time.
**Delivers:** Twitter/X scraper adapter (ScrapeCreators primary, RapidAPI Old Bird V2 fallback, manual entry), TikTok scraper adapter (ScrapeCreators primary, ttapi fallback, manual entry), YouTube scraper adapter (YouTube Data API v3 primary, ScrapeCreators fallback, manual entry), per-platform analysis routing, platform health check canary cron job (runs every 15 minutes, writes status to Supabase, surfaces in UI before analysis starts).
**Addresses:** Multi-platform unified dashboard (partial), core engagement metrics per platform.
**Avoids:** Pitfall 6 (silent scraper breaks — canary monitor built here, not later).
**Research flag:** Standard for YouTube (official API). Moderate for Twitter/X and TikTok — ScrapeCreators API schemas need validation against actual responses before implementation.

### Phase 3: Subscriptions and Payments — Stripe First, Razorpay Second

**Rationale:** Once two platforms exist and auth is live, the product has a monetizable surface. Stripe should be implemented before Razorpay because Stripe is simpler (hosted Checkout, no client-side SDK complexity) and serves the global default. Razorpay is additive and targets a specific market; its more complex order-creation + signature-verification flow should not block global payments.
**Delivers:** Stripe Checkout flow, Stripe webhook handler with signature verification and idempotency table, subscription state sync to Supabase, usage limit enforcement tied to subscription tier, upgrade prompt UX triggered at analysis limit and at gated features (competitor comparison, growth tracking), Razorpay integration (India-market checkout, webhook handler, signature verification, same idempotency table).
**Addresses:** Freemium tier with clear limits, dual payment support.
**Avoids:** Pitfall 5 (webhook state divergence — idempotency table built here), Pitfall 1 (usage limits now enforced against paid tier state).
**Research flag:** Standard for Stripe (Vercel official template exists). Needs care for Razorpay — the subscription model differs fundamentally from Stripe; implement as a separate code path, not an abstraction.

### Phase 4: LinkedIn, Facebook, and Competitor Comparison

**Rationale:** LinkedIn and Facebook are the hardest platforms to scrape and should be added after the reliable platforms (Twitter/X, TikTok, YouTube) are proven and the revenue model is live. Competitor comparison (the highest-complexity table-stakes feature) requires the multi-platform pipeline to be stable — it runs the full scraping + analysis pipeline N times in parallel per comparison.
**Delivers:** LinkedIn scraper adapter (ScrapeCreators primary, Apify fallback, manual entry as expected frequent path), Facebook scraper adapter (ScrapeCreators primary, Apify Posts Scraper fallback, manual entry), competitor comparison feature (up to 3 profiles for Pro, up to 10 for Business), competitor profile tracking (saved set of competitors per user in Supabase).
**Addresses:** Competitor comparison (table stakes, required for Pro tier value), LinkedIn and Facebook platform support.
**Avoids:** Pitfall 6 (silent breaks — LinkedIn and Facebook will break more often; manual entry must be first-class UX, not a degraded error state).
**Research flag:** High uncertainty for LinkedIn and Facebook scraping reliability. Budget for frequent scraper maintenance on these two platforms. Do not invest in Puppeteer automation for LinkedIn — maintenance cost exceeds value.

### Phase 5: Multi-Agent AI Enhancement

**Rationale:** Multi-agent analysis is the primary differentiator. It should land after the subscription model is live (so the cost can be gated to Pro tier) and after the platform pipeline is stable (more platforms = richer input data = better analysis). Building it last in the AI layer means it enhances a product that already works and earns revenue, rather than being a launch blocker.
**Delivers:** Multi-agent AI orchestrator (3 parallel worker agents with Haiku, 1 debate round, 1 Sonnet synthesis), per-analysis cost logging, result caching (identical handle + platform within 1 hour returns cached result), `max_tokens` caps on every agent call, streaming of final synthesis response to browser via Vercel AI SDK, single-agent fallback for free/starter tier users.
**Addresses:** Multi-agent AI debate + synthesis (primary differentiator), actionable growth strategies (upgrade from current single-pass analysis).
**Avoids:** Pitfall 3 (function timeout — if multi-platform competitor comparison is being processed, job queue must already be in place from Phase 4), Pitfall 4 (token cost explosion — Haiku workers, caps, and caching built here).
**Research flag:** Needs careful cost modelling before implementation. Run test analyses and log actual token usage per agent before deploying to production. Validate 300s timeout budget on Pro with realistic data.

### Phase 6: Growth Tracking, Hashtag Strategy, and Content Calendar

**Rationale:** These features require accumulated historical data (growth tracking needs snapshots over weeks) and a mature AI layer (content calendar benefits from multi-agent synthesis). They are the highest-perceived-value features for creators but are also the most dependent on all prior phases being stable.
**Delivers:** Historical snapshot scheduler (cron job that captures follower count + engagement rate per tracked profile daily), growth trend dashboard (30/60/90-day charts), hashtag strategy module (builds on existing TF-IDF NLP layer — identify oversaturated vs niche tags, recommend mix), AI content calendar (30-day plan with minimal structured output: date + post_type + topic + hashtags; expand-on-demand for full copy to avoid token bloat), cross-platform growth correlation scoring.
**Addresses:** Historical trend charts, hashtag performance report, AI content calendar (differentiator), cross-platform growth correlation.
**Avoids:** Pitfall 11 (content calendar token bloat — structured minimal output with on-demand expansion), Pitfall 7 (Supabase storage limits — report and snapshot data stored in Supabase Storage, not DB columns).
**Research flag:** Standard for growth tracking (snapshot + chart pattern is well-understood). Content calendar AI prompting needs iteration — plan for 2-3 rounds of prompt tuning before the output quality meets bar.

### Phase Ordering Rationale

- **Auth before everything:** Report persistence, usage limits, competitor tracking, and growth history all require a user identity. Auth is not optional at any stage.
- **Scraper registry before new platforms:** The adapter pattern ensures each new platform is an independent module. Without the registry, each new platform requires changes to the main analysis route.
- **Payments before multi-agent AI:** Multi-agent AI costs real money per analysis. Without a subscription model live, the cost has no recovery mechanism. Gate multi-agent behind Pro tier subscription.
- **Reliable platforms before hard platforms:** Twitter/X, TikTok, and YouTube ship in Phase 2 while LinkedIn and Facebook (higher maintenance burden) ship in Phase 4, by which point the product has revenue to fund their ongoing maintenance.
- **Job queue before competitor comparison:** Competitor comparison runs N full analysis pipelines in parallel. This is structurally impossible as a synchronous Vercel function. The Inngest job-queue pattern must be in place before competitor comparison ships — which is why it belongs in Phase 4 planning, not a retrofit.

### Research Flags

Phases needing deeper research or validation during planning:
- **Phase 2 (Platform Expansion):** ScrapeCreators API response schemas for Twitter/X and TikTok need validation against live API responses before TypeScript types are written. Confirm field names and nullability on actual data.
- **Phase 3 (Razorpay):** The subscription lifecycle (plans + subscriptions + payment retries + `halted` state recovery) is more complex than Stripe. Requires reading Razorpay official subscription docs in full before implementation.
- **Phase 4 (LinkedIn/Facebook):** High uncertainty on scraping reliability. Run canary scrapes manually before committing to these platforms in a sprint. Set explicit fallback-to-manual SLAs in the product.
- **Phase 5 (Multi-agent cost):** Cost model must be validated empirically before production deployment. Run 10–20 test analyses with instrumented token counting per agent. Do not guess.

Phases with standard, well-documented patterns (skip additional research):
- **Phase 1 (Auth):** Supabase `@supabase/ssr` + Next.js App Router is fully documented with official tutorials. Follow the Supabase Next.js guide exactly.
- **Phase 1 (Scraper registry):** The adapter pattern is a standard software design pattern; no domain-specific research needed.
- **Phase 3 (Stripe):** Vercel maintains an official `nextjs-subscription-payments` template. Use it as the reference implementation.
- **Phase 6 (Growth tracking):** Daily snapshot + time-series chart is a solved problem. Standard PostgreSQL time-series query patterns apply.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack unchanged; Supabase SSR and Stripe choices verified against official docs and production templates |
| Features | MEDIUM-HIGH | Competitor feature set well-researched (Iconosquare, Sprout Social, Hootsuite official pages); freemium conversion benchmarks from MEDIUM-confidence sources |
| Architecture | HIGH | Vercel limits from official docs; multi-agent patterns from peer-reviewed paper (ICLR 2025); Supabase schema from official starter |
| Pitfalls | HIGH | CVE verified; race condition pattern verified against post-mortem; Razorpay webhook behaviour from official docs and DEV post-mortem |

**Overall confidence:** HIGH for the build order and technical approach; MEDIUM for scraping reliability on LinkedIn/Facebook (inherently volatile).

### Gaps to Address

- **LinkedIn and Facebook scraping SLA:** Research shows these platforms will fail frequently. The product and UX must be designed with this as an expected state, not an error. Define what "manual entry as first-class UX" means in practice — this needs a product decision, not just a technical one.
- **Inngest vs Vercel Fluid Compute for job queue:** Both are viable for the background processing pattern. Inngest offers better retry handling and step-level timeouts; Vercel Fluid Compute with `waitUntil` is simpler to add. This decision should be made in Phase 4 planning when competitor comparison is scoped.
- **Razorpay INR-only friction:** Indian diaspora abroad or Indian users preferring USD face ambiguous checkout routing. Research recommends user-preference routing over IP geolocation. The exact UX for the payment provider selection screen needs a product decision.
- **Google Trends API stability:** Already integrated and working, but the Google Trends unofficial API has a history of breaking. No official API exists. This is a known ongoing risk — no additional research resolves it.
- **Supabase Pro upgrade trigger:** Currently on free tier (500 MB DB, 50K MAU). The upgrade trigger point should be defined as a concrete metric (e.g., "upgrade when report count approaches 5,000 rows" or "upgrade at 100 paid users") and built into the monitoring from Phase 1.

---

## Sources

### Primary (HIGH confidence)
- [Supabase SSR package docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — Auth patterns, `@supabase/ssr` package, `getUser()` vs `getSession()`
- [Vercel Function Limits (official)](https://vercel.com/docs/limits) — Timeout limits, Fluid Compute, function config
- [Vercel nextjs-subscription-payments template](https://github.com/vercel/nextjs-subscription-payments) — Stripe + Next.js reference
- [Stripe + Next.js 15 with Supabase](https://dev.to/flnzba/33-stripe-integration-guide-for-nextjs-15-with-supabase-13b5) — Stripe integration patterns
- [ICLR 2025: Multi-LLM-Agents Debate](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/) — Multi-agent debate patterns, hallucination reduction
- [Multi-Agent Collaboration Survey (arxiv 2501.06322)](https://arxiv.org/html/2501.06322v1) — COLA framework, debate patterns
- [Supabase RLS CVE-2025-48757](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — service_role key exposure consequences
- [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing) — Token costs for cost model
- [Iconosquare Features](https://www.iconosquare.com/features/listening) — Competitor feature benchmark
- [Razorpay subscription integration guide](https://razorpay.com/docs/payments/subscriptions/integration-guide/) — Subscription lifecycle

### Secondary (MEDIUM confidence)
- [ScrapeCreators API](https://scrapecreators.com/) — Twitter/X, TikTok, LinkedIn, Facebook scraping
- [Inngest: Vercel long-running functions](https://www.inngest.com/blog/vercel-long-running-background-functions) — Job queue pattern
- [Razorpay Next.js 14 App Router integration](https://medium.com/@yadavpiyush222/how-to-integrate-razorpay-payment-gateway-in-next-js-14-app-router-02653384659a)
- [Race condition free-plan bypass post-mortem](https://medium.com/@mhmodgm54/race-condition-chained-with-logic-bug-leads-to-full-bypass-of-free-plan-site-limit-5825f5e2cb1c)
- [Free tier SaaS abuse patterns](https://trueguard.io/blog/what-is-free-tier-abuse-and-how-saas-can-prevent-it)
- [Userpilot: Freemium Conversion Rate Guide](https://userpilot.com/blog/freemium-conversion-rate/) — 2-5% typical, 6-10% creator/SMB
- [Vercel AI SDK docs](https://ai-sdk.dev/docs/introduction) — Streaming patterns

### Tertiary (LOW-MEDIUM confidence — scraping ecosystem volatile)
- [LinkedIn scraping guide 2025](https://scrapecreators.com/blog/linkedin-scraping-guide-2025)
- [What happens when platforms catch you scraping](https://scrapecreators.com/blog/what-happens-when-social-media-companies-catch-you-scraping-a-platform-by-platform-guide)
- [Social media scraping 2025](https://scrapfly.io/blog/posts/social-media-scraping-in-2025)

---

*Research completed: 2026-03-31*
*Ready for roadmap: yes*
