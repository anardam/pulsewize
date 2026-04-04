# Technology Stack

**Project:** InstaAnalyse — Multi-Platform Social Media Analytics with AI
**Researched:** 2026-03-31
**Confidence:** MEDIUM-HIGH (core stack HIGH, scraping APIs MEDIUM due to ecosystem volatility)

---

## Recommended Stack

### Core Framework (Keep Existing)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 14.2.35 (current) | Full-stack React, App Router | Already deployed, works on Vercel, keep it — upgrading to 15 is optional but not worth the churn now |
| TypeScript | ^5 | Type safety | Already in place, strict mode, no change needed |
| Tailwind CSS | ^3.4.1 | Styling | Already in place, no change needed |

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | ^2.100.1 | Supabase client | Latest stable, officially maintained |
| @supabase/ssr | ^0.10.0 | SSR-safe auth cookies for Next.js App Router | **Required** — replaces the deprecated `@supabase/auth-helpers-nextjs`. Cookie-based sessions, works in Server Components, Route Handlers, and Middleware. Supabase's official recommendation since 2024. |

**Auth approach:** Google OAuth + email/password via Supabase Auth. Do NOT use NextAuth/Auth.js — it adds indirection when Supabase already provides auth with DB integration. Do NOT use the old `@supabase/auth-helpers-nextjs` — it is deprecated and unmaintained.

**Session pattern:** Middleware + `createServerClient` per-request. Never call `createBrowserClient` in Server Components.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase (PostgreSQL) | Managed | User data, reports, subscriptions, usage tracking | Free tier: 500 MB storage, 50K MAU, unlimited API requests. Built-in Row Level Security (RLS) enforces per-user data isolation at DB level — required for multi-tenant subscription model. No separate DB infrastructure needed. |

**RLS pattern for subscriptions:** Store subscription tier in a `user_profiles` table. RLS policies reference `auth.uid()` and `user_profiles.subscription_tier` to gate premium data. Do NOT handle tier-gating only in application code — always enforce at the DB layer.

**Warning:** Free tier pauses after 1 week of inactivity. Upgrade to Supabase Pro ($25/month) once revenue starts or when 2 free project slots are exhausted.

### Payments

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe | ^21.0.1 | International payment processing + subscriptions | Industry standard, excellent Next.js integration, official Vercel template available. Use Stripe Checkout for hosted payment page — avoids PCI scope for card data. |
| razorpay | ^2.9.6 | India-market payment processing | Required for UPI, domestic cards, netbanking. Does not support Stripe Checkout model — requires client-side SDK + server-side order creation + verification. More integration work than Stripe. |

**Webhook pattern (both providers):**
1. Stripe/Razorpay sends event to `/api/webhooks/stripe` or `/api/webhooks/razorpay`
2. Route handler verifies signature, updates `subscriptions` table in Supabase
3. Supabase RLS policies read subscription state — no in-memory state needed

**Do NOT** try to use one abstraction layer over both payment providers. Their models differ fundamentally (Stripe subscription objects vs Razorpay plans+subscriptions). Implement each separately with a shared `subscription_service.ts` interface.

### AI Analysis

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.80.0 | Anthropic Claude API client | Already integrated and working. Current version supports streaming, tool use, and multi-turn conversations. |

**Multi-agent pattern:** Use parallel Claude API calls (not the Claude Agent SDK) for the analysis debate pattern. The Claude Agent SDK is designed for interactive coding agents — it is not the right tool for a structured parallel-analysis web app.

Concrete approach:
1. Spawn 2-3 simultaneous `client.messages.create()` calls with different system prompts (Growth Strategist, Content Analyst, Competitive Intelligence Analyst)
2. Collect all responses (Promise.all)
3. Pass results to a Synthesizer call that resolves contradictions and produces the final report

**Use Vercel AI SDK (`ai` ^6.0.141) for streaming** if you want to stream the final synthesis response to the browser via `useChat` or `useCompletion`. The AI SDK abstracts Anthropic's streaming format and provides React hooks. However, parallel analysis calls that don't need streaming can go directly through `@anthropic-ai/sdk`.

**Model to use:** `claude-sonnet-4-20250514` (already in use) — correct balance of quality and cost for structured report generation. Do NOT switch to Opus for routine analysis — cost is prohibitive at scale.

### Social Media Data Acquisition

This is the highest-risk stack area. Platform defenses change constantly. Use a cascading fallback strategy (matching the existing Instagram pattern) for every platform.

#### Twitter/X

| Technology | Purpose | Why | Cost |
|------------|---------|-----|------|
| ScrapeCreators Twitter API | Primary: profile + tweet data | Pay-as-you-go credits, public data only, maintained in 2025 | ~$10 for 5K credits |
| RapidAPI "Old Bird V2" (Twitter141) | Fallback | Up to 1M tweets/month at $179.99 — cost-effective at scale | Subscription |
| Manual entry | Last resort | Always required as final fallback per existing app pattern | Free |

**Do NOT use the official X (Twitter) API** for profile analytics. Free tier removed, Basic costs $100/month with severe rate limits, Pro is $5,000/month. Completely non-viable for a freemium product.

#### TikTok

| Technology | Purpose | Why | Cost |
|------------|---------|-----|------|
| ScrapeCreators TikTok API | Primary | Covers profile info, videos, engagement; documented, actively maintained | ~$10/5K credits shared |
| RapidAPI TikTok-Scraping (ttapi) | Fallback | Dedicated TikTok scraper on RapidAPI | Varies by tier |
| Manual entry | Last resort | Always required | Free |

**Do NOT use the official TikTok for Developers API** for competitor analysis — it requires app review, strict data governance, and does not expose competitor profile data.

#### YouTube

| Technology | Purpose | Why | Cost |
|------------|---------|-----|------|
| YouTube Data API v3 (official) | Primary: channel stats, video metadata | **Only YouTube data source worth using.** Free quota: 10,000 units/day. Channel lookup costs 1 unit, videos.list costs 1-5 units. Very generous for profile analysis. | Free within quota |
| ScrapeCreators YouTube API | Fallback if quota exhausted | Same credit pool as other platforms | ~$10/5K credits |
| Manual entry | Last resort | Always required | Free |

**YouTube is the exception** — use the official API first. Google enforces ToS aggressively and official API is free within reasonable limits.

#### LinkedIn

| Technology | Purpose | Why | Cost |
|------------|---------|-----|------|
| ScrapeCreators LinkedIn API | Primary | hiQ v. LinkedIn ruling (2022) established public scraping is legal; ScrapeCreators covers public profiles | ~$10/5K credits |
| Apify LinkedIn Scraper Actor | Fallback | Well-rated, actively maintained Actor on Apify marketplace | Usage-based |
| Manual entry | Last resort (likely frequently used) | LinkedIn is most aggressively defended — manual fallback will trigger often | Free |

**Warning:** LinkedIn is the hardest platform to scrape reliably. Expect this fallback to manual entry more often than other platforms. Do NOT invest in complex Puppeteer automation for LinkedIn — the cost of maintenance exceeds the value.

#### Facebook

| Technology | Purpose | Why | Cost |
|------------|---------|-----|------|
| ScrapeCreators (if available) | Primary | Shared credits, consistent API interface | ~$10/5K credits |
| Apify Facebook Posts Scraper | Fallback | ~$5-8 per 1K posts, public pages only | Usage-based |
| Manual entry | Last resort | Facebook Graph API deprecated public page access in 2023 | Free |

**Warning:** Facebook public page scraping is increasingly difficult. Only target public Facebook Pages (not personal profiles). The official Graph API no longer provides competitor page analytics without business verification.

#### Instagram (Existing)

Keep the existing 4-strategy cascade (RapidAPI → Instagram public API → Puppeteer → Instaloader). No changes needed.

### Vercel Deployment Constraints

| Constraint | Limit | Mitigation |
|------------|-------|------------|
| Serverless function timeout (Pro) | 300s standard, 800s with Fluid Compute | Enable Fluid Compute for `/api/analyze` routes; multi-agent parallel analysis fits within 300s if individual calls are bounded to 60s each |
| Function cold start | ~200-500ms | Accept this; no warm-keeping strategy needed at v1 scale |
| No persistent processes | N/A | All scraping is request-scoped; no background workers needed |

**Multi-agent parallel analysis fits Vercel:** Three simultaneous 60s Claude calls finish in ~60s total (parallel), well under 300s. Enable `maxDuration = 300` in route config.

### Supporting Libraries (New Additions)

| Library | Version | Purpose | When to Add |
|---------|---------|---------|-------------|
| @google-analytics/data | Latest | YouTube Data API v3 is accessed via googleapis — use `googleapis` package | Phase: YouTube integration |
| googleapis | ^144.x | YouTube Data API v3 client | Phase: YouTube integration |
| zod | ^3.x | Schema validation for scraped data from all platforms | Phase 1 — add immediately with auth |
| @stripe/stripe-js | ^4.x | Stripe.js client-side for Checkout redirect | Phase: Payments |
| svix | ^1.x | Stripe webhook signature verification (alternative to raw crypto) | Optional |

### Testing (New — Zero Coverage Currently)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| vitest | ^2.x | Unit + integration tests | Faster than Jest, native TypeScript, compatible with Next.js App Router |
| @testing-library/react | ^16.x | Component tests | Standard for React |
| playwright | ^1.x | E2E tests | Official Vercel/Next.js recommended E2E framework; can test auth flows end-to-end |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Supabase Auth | NextAuth/Auth.js | NextAuth adds abstraction without benefit when Supabase already owns the DB + auth. Two systems to debug. |
| Auth | Supabase Auth | Clerk | Clerk is excellent but costs $25+/month on paid tier and doesn't integrate with Supabase DB as naturally. Unnecessary cost for v1. |
| Database | Supabase PostgreSQL | PlanetScale / Neon | Supabase was already chosen and includes auth + storage. No migration benefit. |
| Database | Supabase PostgreSQL | Redis (for sessions) | Supabase handles sessions via cookies + JWT; no Redis needed. |
| Payments | Stripe + Razorpay | LemonSqueezy | LemonSqueezy doesn't support India-specific payment methods (UPI) required for Razorpay use case. |
| AI streaming | Vercel AI SDK | Custom SSE | Vercel AI SDK v6 eliminates the need for custom streaming. Use it for the final synthesis stream; it handles Anthropic natively. |
| Multi-agent | Claude Agent SDK | Direct parallel API calls | Claude Agent SDK is CLI-oriented, designed for interactive coding sessions. Direct API calls with Promise.all are simpler, faster, and purpose-built for structured web app analysis. |
| Scraping | ScrapeCreators (primary) | Bright Data | Bright Data is excellent but pricing starts significantly higher ($500+/month for managed). Not viable for freemium v1. |
| YouTube data | ScrapeCreators | YouTube official API | Official API is free, reliable, and has no ToS risk. Always prefer official when available. |
| Testing | Vitest | Jest | Vitest is faster, has better TypeScript support out of the box, and is the direction the ecosystem is moving in 2025. |

---

## Installation

```bash
# Authentication + Database
npm install @supabase/supabase-js@^2.100.1 @supabase/ssr@^0.10.0

# Payments
npm install stripe@^21.0.1 razorpay@^2.9.6 @stripe/stripe-js@^4.x

# AI streaming (for browser-side streaming of final analysis)
npm install ai@^6.0.141

# Schema validation (add immediately — needed for scraper output validation)
npm install zod@^3.x

# YouTube official API
npm install googleapis

# Testing
npm install -D vitest@^2.x @testing-library/react@^16.x @playwright/test@^1.x
```

---

## Environment Variables (New)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only, never expose to client

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Social scraping
SCRAPECREATORS_API_KEY=           # Primary scraper for Twitter, TikTok, LinkedIn, Facebook
YOUTUBE_API_KEY=                   # YouTube Data API v3 (Google Cloud Console)

# Existing
ANTHROPIC_API_KEY=
RAPIDAPI_KEY=
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Supabase Auth + SSR | HIGH | Official docs verified; @supabase/ssr v0.10.0 is the current recommended package |
| Stripe integration | HIGH | Mature, well-documented; Vercel official template exists; v21.0.1 verified |
| Razorpay integration | MEDIUM | Works for Next.js 14/15 per multiple 2025 guides; subscription flows more complex than Stripe |
| Multi-agent via direct API calls | HIGH | Verified Anthropic docs + production patterns; Claude Agent SDK explicitly wrong tool here |
| Twitter/X scraping | MEDIUM | Official API non-viable; ScrapeCreators + Old Bird V2 are viable but third-party ecosystem is volatile |
| TikTok scraping | MEDIUM | ScrapeCreators covers it; platform defenses evolve — fallback to manual is likely needed sometimes |
| YouTube Data API v3 | HIGH | Official API, free tier generous, verified current |
| LinkedIn scraping | LOW-MEDIUM | Hardest platform; legal per hiQ ruling but technically difficult; plan for frequent manual fallbacks |
| Facebook scraping | LOW-MEDIUM | Public Pages only; Graph API deprecated public analytics; expect reliability issues |
| Vercel function limits | HIGH | Official Vercel docs verified; 300s standard, 800s Fluid Compute |

---

## Sources

- [Supabase SSR package docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase pricing 2026](https://supabase.com/pricing)
- [Stripe + Next.js 15 complete guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)
- [Vercel nextjs-subscription-payments template](https://github.com/vercel/nextjs-subscription-payments)
- [Stripe + Next.js 15 with Supabase - DEV Community](https://dev.to/flnzba/33-stripe-integration-guide-for-nextjs-15-with-supabase-13b5)
- [Razorpay Next.js 14 App Router integration](https://medium.com/@yadavpiyush222/how-to-integrate-razorpay-payment-gateway-in-next-js-14-app-router-02653384659a)
- [Razorpay subscriptions official docs](https://razorpay.com/docs/payments/subscriptions/integration-guide/)
- [Anthropic multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [ScrapeCreators API](https://scrapecreators.com/)
- [Twitter/X scraping API alternatives 2025](https://scrapecreators.com/blog/how-to-scrape-twitter-x-api-2025)
- [Best TikTok Data APIs 2025](https://www.socialkit.dev/blog/best-tiktok-data-apis-2025)
- [LinkedIn scraping guide 2025](https://scrapecreators.com/blog/linkedin-scraping-guide-2025)
- [Apify social media scrapers 2026](https://blog.apify.com/top-social-media-scrapers/)
- [Vercel function duration limits](https://vercel.com/docs/functions/configuring-functions/duration)
- [Vercel AI SDK docs](https://ai-sdk.dev/docs/introduction)
- [Vercel AI SDK Claude 4 guide](https://ai-sdk.dev/cookbook/guides/claude-4)
