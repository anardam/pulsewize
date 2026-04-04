# Architecture Patterns

**Domain:** Multi-platform social media analytics SaaS
**Researched:** 2026-03-31
**Confidence:** HIGH (Vercel/Supabase limits from official docs; multi-agent patterns from peer-reviewed survey + implementation article; schema patterns from established SaaS starters)

---

## Context: Current State vs Target State

The current system is a single-page Next.js App Router app with:
- No database (localStorage only)
- No auth
- In-memory rate limiting (resets on cold start)
- Single platform (Instagram), four scrapers in cascade
- Single AI call per analysis (one Claude invocation, sequential prompt)

The target system must add: Supabase auth + Postgres, multi-platform scraping (6 platforms), subscription/usage gating, dual payments (Stripe + Razorpay), and multi-agent AI analysis with debate/consensus.

Every architectural decision below is constrained by **Vercel serverless** (10s default timeout on Hobby, 60s max on Hobby / 300s max on Pro for legacy functions; Fluid Compute raises this to 800s on Pro). This is the single biggest constraint on how complex operations are structured.

---

## Recommended Architecture

### System Diagram

```
Browser (Next.js App Router)
       |
       | HTTPS
       v
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Layer (Vercel Serverless Functions)            │
│                                                             │
│  /api/auth/*         (Supabase Auth callbacks)             │
│  /api/analyze        (main analysis pipeline)              │
│  /api/platforms/*    (per-platform scrape endpoints)       │
│  /api/subscriptions  (Stripe/Razorpay webhooks)            │
│  /api/reports/*      (CRUD for saved reports)              │
│  /api/health         (env/capability check)                │
└─────────────────────────────────────────────────────────────┘
       |                           |
       | Server Actions            | Direct DB
       v                           v
┌────────────────┐    ┌───────────────────────────┐
│  Supabase Auth │    │  Supabase Postgres         │
│  (Google OAuth │    │                            │
│  + Email/Pass) │    │  users (profile)           │
└────────────────┘    │  subscriptions             │
                      │  usage_records             │
                      │  reports                   │
                      │  platform_profiles         │
                      └───────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────┐
│  External Services                               │
│                                                  │
│  Anthropic Claude API  (AI analysis, 3 agents)  │
│  RapidAPI              (social scraping)         │
│  Google Trends API     (niche signals)           │
│  Stripe                (global payments)         │
│  Razorpay              (India payments)          │
└─────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Auth Component

**Responsibility:** Establish user identity. Issue and refresh session cookies. Guard protected routes.

**Implementation:** Supabase SSR auth via `@supabase/ssr` package. Middleware (`src/middleware.ts`) refreshes tokens on every request using `supabase.auth.getClaims()` (NOT `getSession()` — the docs explicitly warn against `getSession()` on the server because it does not re-validate the JWT). Sessions are stored in cookies, not localStorage.

**Communicates with:** All protected API routes (session forwarded via cookie), Supabase Auth service, Next.js middleware layer.

**Key rule:** Never trust the session payload from the client. Always re-validate server-side via `getClaims()` in middleware before accessing protected resources.

### 2. Platform Scraper Registry

**Responsibility:** Provide a uniform interface for fetching social profile data from any supported platform (Instagram, Twitter/X, TikTok, YouTube, LinkedIn, Facebook). Hide all platform-specific fallback logic behind a single `scrape(platform, handle)` call.

**Implementation:** Adapter pattern. Each platform has a `PlatformScraper` module that exports `scrape(handle): Promise<ScraperResult>`. A registry maps platform slugs to their scraper module. The `/api/analyze` route calls `ScraperRegistry.get(platform).scrape(handle)` — it does not know or care which specific strategy each platform uses internally.

**Existing Instagram scrapers (`instagram.ts`, `scraper-rapidapi.ts`, `scraper-puppeteer.ts`, `instaloader.ts`) become the Instagram adapter's internal fallback chain.** The external interface stays stable as new platforms are added.

**Communicates with:** `/api/analyze`, RapidAPI, platform-specific public APIs, Puppeteer (local only), Python subprocesses (local only).

**Constraint:** Puppeteer and Python subprocess scrapers cannot run on Vercel. Vercel deployments must use only HTTP-based scrapers (RapidAPI, public REST endpoints). The environment detection logic already in `analyze/route.ts` should move into each adapter.

### 3. Enrichment Pipeline

**Responsibility:** Augment raw scraped profile data with NLP signals (keyword extraction, sentiment) and external trend signals (Google Trends) before passing to AI analysis.

**Implementation:** Unchanged from current (`nlp.ts`, `trends.ts`). Both run in parallel (`Promise.all`). As new platforms are added, platform-specific enrichment adapters can be added here (e.g., YouTube SEO keyword extraction differs from Instagram hashtag analysis).

**Communicates with:** `/api/analyze`, Google Trends API, `natural` NLP library.

### 4. Multi-Agent AI Orchestrator

**Responsibility:** Produce a richer analysis by running multiple independent Claude agents, facilitating a debate between them, and synthesizing a final report. This replaces the current single-prompt Claude call.

**Implementation:** Three-phase pipeline within a single API route invocation:

```
Phase 1 — Parallel Independent Analysis (3 agents in parallel via Promise.all)
  Agent A: Growth Strategist perspective (focused on follower growth tactics)
  Agent B: Content Quality Analyst perspective (focused on content structure)
  Agent C: Monetisation Specialist perspective (focused on revenue potential)

Phase 2 — Debate Round (sequential, agents respond to each other)
  Each agent reads the other two analyses, identifies disagreements, adds rebuttals.
  Fixed at 1 debate round (time constraint — Vercel max 300s on Pro).

Phase 3 — Synthesis (single judge agent)
  A fourth Claude call reads all three original analyses + rebuttals.
  Produces the final AnalysisReport JSON.
```

**Why this design:** The research shows that debate-based multi-agent patterns improve factuality and reduce hallucination compared to single-agent calls (arxiv 2501.06322). Three agents with distinct roles is the sweet spot before "majority herding" (where agents converge too quickly to superficially similar answers). Fixed-round termination (1 debate round) is the correct choice here — explicit consensus signals from agents would require unpredictable response parsing, and open-ended debate loops will blow Vercel's function timeout. The judge/synthesizer pattern is preferable to majority voting for an analysis product because it preserves nuance from minority perspectives.

**Timeout risk:** Four Claude API calls (3 parallel + 1 synthesis) on Vercel Pro with a 300s max function timeout is feasible but tight. The debate round (Phase 2) adds latency because it is sequential. On Hobby (60s max), multi-agent is not viable — fall back to single-agent for free tier users.

**Communicates with:** Anthropic Claude API (4 calls per analysis), `/api/analyze`.

### 5. Usage Gating Layer

**Responsibility:** Enforce tier limits. Track analyses consumed per user per billing month. Block requests when limits are exceeded. Return remaining quota to the client for display.

**Implementation:** Postgres-based, enforced in the API route before the expensive scrape+AI pipeline runs.

```sql
-- usage_records table
id              uuid primary key
user_id         uuid references auth.users(id)
billing_month   date  -- first day of the month, e.g. 2026-03-01
analyses_used   integer default 0
platform        text  -- 'instagram' | 'twitter' | 'tiktok' | etc.

-- Unique constraint prevents duplicate rows
unique(user_id, billing_month, platform)
```

The check is an atomic `SELECT ... FOR UPDATE` + conditional `UPDATE` in a single Postgres transaction. This avoids race conditions where two concurrent requests could both read `analyses_used = 2` (below the free limit of 3) and both proceed.

**Communicates with:** Supabase Postgres, `/api/analyze`, subscription state.

**Tier caps stored in code (not DB):**

```typescript
const TIER_LIMITS = {
  free:    { analyses_per_month: 3,   multi_agent: false, platforms: ['instagram'] },
  starter: { analyses_per_month: 20,  multi_agent: false, platforms: ['instagram', 'twitter', 'tiktok'] },
  pro:     { analyses_per_month: 100, multi_agent: true,  platforms: 'all' },
} as const;
```

Storing limits in code (not DB) means tier changes require a deploy, not a DB migration — acceptable for v1. It also means limits are part of version control history.

### 6. Subscription Component

**Responsibility:** Record and sync payment provider state. Determine each user's current tier. Handle checkout flows and webhooks.

**Implementation:** Stripe-first (global default). Razorpay for Indian users (detected by IP or user preference). Both payment providers webhook into `/api/subscriptions/stripe-webhook` and `/api/subscriptions/razorpay-webhook` respectively. Webhooks update the `subscriptions` table.

```sql
-- subscriptions table
id                uuid primary key
user_id           uuid references auth.users(id)
provider          text  -- 'stripe' | 'razorpay'
provider_customer_id  text
provider_subscription_id  text
tier              text  -- 'free' | 'starter' | 'pro'
status            text  -- 'active' | 'past_due' | 'canceled' | 'trialing'
current_period_end  timestamptz
created_at        timestamptz
updated_at        timestamptz
```

The source of truth for `tier` is the `subscriptions` table (synced from payment provider via webhook). The API never trusts a tier claim from the client.

**Communicates with:** Stripe API, Razorpay API, Supabase Postgres (write on webhook), Usage Gating Layer (read on each request).

### 7. Report Persistence Component

**Responsibility:** Store completed analysis reports associated with a user. Support retrieval, listing, and deletion. Replace the current localStorage approach.

**Implementation:** Supabase Postgres `reports` table with Row Level Security. RLS policies ensure users can only read/write their own reports. PDF export (existing jsPDF integration) remains client-side — the client fetches the report JSON and generates the PDF locally.

```sql
-- reports table
id              uuid primary key
user_id         uuid references auth.users(id)
platform        text
handle          text
report_data     jsonb  -- the full AnalysisReport type
created_at      timestamptz
```

**Communicates with:** Supabase Postgres (RLS-protected), `/api/reports/*`, `ReportDashboard` component.

### 8. Frontend Application Layer

**Responsibility:** Render all UI states. Manage client-side state. Route authenticated vs unauthenticated users. Fetch data from API routes.

**Implementation:** Next.js App Router with a mix of Server Components (dashboard, report history, account page — rendered server-side with Supabase session) and Client Components (analysis form, real-time loading states, interactive report). The current single-page state machine in `page.tsx` gets broken into proper routes:

```
/                   → Landing page (static, unauthenticated)
/dashboard          → User dashboard (protected, Server Component)
/analyze            → Analysis form (protected, Client Component)
/reports/[id]       → Report view (protected, can be Server Component)
/account            → Account + subscription management (protected)
/login              → Auth page (Supabase Auth UI or custom)
```

**Communicates with:** All `/api/*` routes via `fetch()`, Supabase client for auth state, no direct Postgres access from client (all DB access goes through API routes or Server Components).

---

## Data Flow

### Primary Analysis Flow (authenticated user)

```
1. User submits handle + platform in /analyze (Client Component)
2. Client POSTs to /api/analyze with session cookie (auto-sent)
3. Middleware validates session via supabase.auth.getClaims()
4. /api/analyze reads user's subscription tier from Supabase
5. Usage gate: atomic check+increment in Postgres (fail fast if limit exceeded)
6. ScraperRegistry.get(platform).scrape(handle) runs the platform adapter
   - If all scrapers fail → return { requiresManualEntry: true } (HTTP 422)
7. Enrichment: NLP + Google Trends run in parallel
8. Multi-agent AI orchestration:
   a. 3 parallel Claude calls (3 specialist agents) — if tier is 'pro'
   b. 1 debate round (each agent reviews others' output)
   c. 1 synthesis call → AnalysisReport JSON
   OR: single Claude call if tier is 'free' or 'starter'
9. Report saved to Supabase (reports table)
10. AnalysisReport returned to client
11. Client renders ReportDashboard; localStorage usage_records removed
```

### Subscription Lifecycle Flow

```
1. User clicks "Upgrade" → client calls /api/subscriptions/create-checkout
2. API creates Stripe/Razorpay checkout session, returns URL
3. Client redirects to payment provider hosted page
4. User pays
5. Provider sends webhook to /api/subscriptions/[provider]-webhook
6. Webhook handler validates signature (CRITICAL — never skip)
7. Supabase subscriptions table updated with new tier and status
8. User redirected back to /dashboard with active subscription
```

### Usage Reset Flow

```
Vercel Cron Job: 0 0 1 * * (first day of each month)
→ /api/cron/reset-usage
→ INSERT into usage_records with new billing_month (no DELETE needed)
   New month rows start at analyses_used = 0 automatically
   (the get-or-create pattern: UPSERT with ON CONFLICT DO NOTHING)
```

Note: The usage reset does not actually delete old rows. Each `(user_id, billing_month, platform)` row is an append-only record. The check logic always queries the current billing month row specifically.

### Auth Flow

```
1. User visits /login
2. Supabase Auth handles OAuth (Google) or email/password
3. On success, Supabase sets httpOnly cookie with JWT
4. Middleware (src/middleware.ts) refreshes token on every request
5. /dashboard route reads session from cookie via server-side Supabase client
6. All protected API routes validate cookie via supabase.auth.getClaims()
```

---

## Patterns to Follow

### Pattern 1: Platform Adapter (Adapter Pattern)

**What:** Each social platform is an independent module implementing `PlatformScraper`.

```typescript
// src/lib/scrapers/types.ts
interface PlatformScraper {
  scrape(handle: string): Promise<ScraperResult>;
  platform: PlatformSlug;
}

// src/lib/scrapers/registry.ts
const SCRAPER_REGISTRY: Record<PlatformSlug, PlatformScraper> = {
  instagram: InstagramScraper,
  twitter: TwitterScraper,
  // ...
};

export const getScraper = (platform: PlatformSlug): PlatformScraper => {
  const scraper = SCRAPER_REGISTRY[platform];
  if (!scraper) throw new Error(`Unsupported platform: ${platform}`);
  return scraper;
};
```

**When:** Adding any new platform. The API route and orchestration layer never need to change — only a new adapter module is added.

**Migration:** The four existing Instagram scrapers (`instagram.ts`, `scraper-rapidapi.ts`, `scraper-puppeteer.ts`, `scraper-rapidapi.ts`) become `src/lib/scrapers/instagram/` with an index that runs the existing fallback chain.

### Pattern 2: Atomic Usage Check-and-Increment

**What:** Check and increment usage in a single Postgres transaction to prevent race conditions.

```sql
-- Called from API route via Supabase RPC (database function)
CREATE OR REPLACE FUNCTION check_and_increment_usage(
  p_user_id uuid,
  p_billing_month date,
  p_platform text,
  p_limit integer
) RETURNS TABLE(allowed boolean, current_count integer) AS $$
DECLARE
  v_count integer;
BEGIN
  -- Upsert ensures row exists
  INSERT INTO usage_records (user_id, billing_month, platform, analyses_used)
  VALUES (p_user_id, p_billing_month, p_platform, 0)
  ON CONFLICT (user_id, billing_month, platform) DO NOTHING;

  -- Lock the row and check/increment atomically
  SELECT analyses_used INTO v_count
  FROM usage_records
  WHERE user_id = p_user_id
    AND billing_month = p_billing_month
    AND platform = p_platform
  FOR UPDATE;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT false, v_count;
  ELSE
    UPDATE usage_records
    SET analyses_used = analyses_used + 1
    WHERE user_id = p_user_id
      AND billing_month = p_billing_month
      AND platform = p_platform;
    RETURN QUERY SELECT true, v_count + 1;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**When:** Every call to `/api/analyze`, before the expensive scrape+AI pipeline.

### Pattern 3: Webhook Signature Validation (Security Critical)

**What:** Always validate payment provider webhook signatures before processing events.

```typescript
// Stripe
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

// Razorpay
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
if (expectedSignature !== receivedSignature) throw new Error('Invalid signature');
```

**When:** Always, in every webhook handler. Never process a webhook event without first verifying its signature. An attacker could call your webhook endpoint directly to grant themselves a pro subscription.

### Pattern 4: Multi-Agent Orchestration with Fixed Rounds

**What:** Run N agents in parallel, one debate round, then synthesize.

```typescript
// src/lib/ai/multi-agent-orchestrator.ts
export async function analyzeWithDebate(
  profileData: EnrichedProfileData
): Promise<AnalysisReport> {
  // Phase 1: Parallel independent analyses
  const [growthAnalysis, contentAnalysis, monetisationAnalysis] = await Promise.all([
    callClaude(buildAgentPrompt('growth_strategist', profileData)),
    callClaude(buildAgentPrompt('content_analyst', profileData)),
    callClaude(buildAgentPrompt('monetisation_specialist', profileData)),
  ]);

  // Phase 2: Single debate round (sequential)
  const debateContext = { growthAnalysis, contentAnalysis, monetisationAnalysis };
  const [growthRebuttal, contentRebuttal, monetisationRebuttal] = await Promise.all([
    callClaude(buildDebatePrompt('growth_strategist', debateContext)),
    callClaude(buildDebatePrompt('content_analyst', debateContext)),
    callClaude(buildDebatePrompt('monetisation_specialist', debateContext)),
  ]);

  // Phase 3: Synthesis
  return callClaude(buildSynthesisPrompt({
    analyses: debateContext,
    rebuttals: { growthRebuttal, contentRebuttal, monetisationRebuttal },
  }));
}
```

**When:** Pro tier users only. Free and Starter tiers use `analyzeWithSingleAgent()`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Trusting Client-Provided Tier or Usage Claims

**What:** Accepting `{ tier: 'pro' }` or `{ analysesUsed: 2 }` from the client request body.

**Why bad:** Any user can manipulate request bodies. The subscription tier and usage count must always be read from Supabase on the server, never from the client.

**Instead:** Read tier from `subscriptions` table using the authenticated user ID from the validated session.

### Anti-Pattern 2: Per-Request Cold-Start Rate Limiting

**What:** The current `src/lib/rate-limit.ts` uses an in-memory Map. On Vercel, each function instance has its own memory. A user can bypass the rate limit by triggering enough cold starts (or just by luck, hitting different instances).

**Why bad:** In-memory state is not shared across serverless function instances. The existing limiter provides false security.

**Instead:** Database-based usage tracking (the `usage_records` table) replaces in-memory rate limiting. The Postgres-backed atomic increment is the only reliable enforcement mechanism on serverless.

### Anti-Pattern 3: Open-Ended Agent Debate Loops

**What:** Agents continue debating until they explicitly agree ("FINAL ANSWER" markers), with no maximum round cap.

**Why bad:** Vercel functions have hard timeout limits. If agents disagree on a difficult analysis, the loop will time out mid-execution, producing an incomplete response. Token costs also grow unboundedly.

**Instead:** Hard-cap at 1 debate round. The synthesis agent's job is to resolve disagreements, not the debate itself.

### Anti-Pattern 4: Storing Claude API Key in localStorage

**What:** The current implementation allows users to provide their own Anthropic API key via the browser, stored in localStorage, and passed via `x-api-key` header.

**Why bad:** With Supabase auth and a subscription model, the app owns the API key. Users pay for platform access (the subscription), not for their own API keys. The personal API key flow should be removed or restricted to a developer/power mode.

**Instead:** The server always uses `process.env.ANTHROPIC_API_KEY`. Usage is controlled by the subscription tier, not by API key ownership.

### Anti-Pattern 5: Skipping Webhook Signature Validation

**What:** Processing payment events without verifying the request came from the actual payment provider.

**Why bad:** Attackers can POST to your webhook endpoint to grant themselves premium subscriptions or trigger billing events.

**Instead:** Always validate signatures first. Reject immediately if signature is invalid.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Rate limiting | Postgres usage_records table | Same — Postgres handles it | Partition usage_records by billing_month |
| Scraping | Single RapidAPI account | RapidAPI may hit rate limits — add caching layer (Redis/Upstash) | Dedicated scraping infrastructure (not Vercel) |
| Multi-agent AI | 4 Claude calls per analysis — cost controlled by tier | Same — Claude cost is primary scaling concern | Evaluate caching analyses for identical handles within 24h |
| Report storage | Supabase free tier (500 MB) | Supabase Pro ($25/month, 8 GB) | Archive old reports to Vercel Blob storage |
| Vercel function timeout | Pro plan for 300s limit | Pro plan sufficient | Consider migrating analysis to a dedicated compute service |
| Payment webhooks | Single serverless endpoint handles it | Same — webhooks are low frequency | Same |

---

## Supabase Schema Overview

```sql
-- Mirrors Supabase auth.users (created by trigger on signup)
CREATE TABLE public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  avatar_url      text,
  created_at      timestamptz default now()
);

CREATE TABLE public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  provider                  text not null,  -- 'stripe' | 'razorpay'
  provider_customer_id      text,
  provider_subscription_id  text,
  tier                      text not null default 'free',
  status                    text not null default 'active',
  current_period_end        timestamptz,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

CREATE TABLE public.usage_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  billing_month   date not null,  -- first day of month
  platform        text not null,
  analyses_used   integer not null default 0,
  unique(user_id, billing_month, platform)
);

CREATE TABLE public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  platform        text not null,
  handle          text not null,
  report_data     jsonb not null,
  created_at      timestamptz default now()
);

-- RLS: all tables are access-controlled by user_id = auth.uid()
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports       ENABLE ROW LEVEL SECURITY;
```

---

## Suggested Build Order (Dependencies)

The components have a dependency graph that dictates a natural build order:

**Tier 1 — Foundation (nothing depends on them being absent)**
1. Supabase schema (profiles, subscriptions, usage_records, reports tables + RLS)
2. Auth component (middleware, login page, session refresh)

Without auth, nothing else can be user-scoped. Without the schema, nothing can persist.

**Tier 2 — Platform-Agnostic Infrastructure**
3. Platform Scraper Registry (adapter abstraction + migrate Instagram scrapers as first adapter)
4. Usage Gating Layer (depends on schema from Tier 1)

The scraper registry must exist before new platforms can be added. The usage gate must exist before subscriptions are enforced.

**Tier 3 — Business Logic**
5. Subscription Component — Stripe first (depends on auth from Tier 1, usage gate from Tier 2)
6. Report Persistence (depends on auth, schema)

**Tier 4 — Platform Expansion**
7. Twitter/X adapter, TikTok adapter, etc. (depends on registry from Tier 2)

Each platform is independently addable once the registry exists.

**Tier 5 — AI Enhancement**
8. Multi-agent orchestrator (depends on subscription gating from Tier 3 — gating determines which tier gets multi-agent)

Multi-agent is the highest-risk/highest-complexity component. Build it last when the subscription model already enforces who gets it.

**Tier 6 — Secondary Features**
9. Razorpay payment integration (depends on subscription component from Tier 3)
10. Growth tracking dashboard (depends on report persistence from Tier 3)

Razorpay is an additive payment method, not foundational. Dashboard requires report history to exist.

---

## Vercel Constraint Summary

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| 10s default timeout (Hobby) | Multi-agent AI is impossible on Hobby plan | Multi-agent is Pro tier only; single-agent for free users |
| 300s max (Pro, legacy functions) | 4 Claude calls (multi-agent) must complete in <300s | Cap debate to 1 round; use `maxTokens` limits per agent call |
| No persistent memory across instances | In-memory rate limiting is unreliable | Replace with Postgres-based usage_records |
| No WebSockets | Can't stream analysis progress | Use polling (`/api/analyze/status`) or `waitUntil` with optimistic UI |
| No Puppeteer/Python on Vercel | Scraping limited to HTTP-based strategies | Environment detection is already in place; extend to adapter level |
| Cold starts | First analysis request may be slow | Acceptable for SaaS — not a real-time product |

---

## Sources

- [Vercel Function Limits (official)](https://vercel.com/docs/limits) — HIGH confidence, fetched 2026-03-31
- [Supabase Next.js App Router Tutorial (official)](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs) — HIGH confidence, fetched 2026-03-31
- [Multi-Agent Collaboration Mechanisms: A Survey of LLMs (arxiv 2501.06322)](https://arxiv.org/html/2501.06322v1) — HIGH confidence, peer-reviewed
- [Patterns for Democratic Multi-Agent AI: Debate-Based Consensus (Medium)](https://medium.com/@edoardo.schepis/patterns-for-democratic-multi-agent-ai-debate-based-consensus-part-2-implementation-2348bf28f6a6) — MEDIUM confidence, single author implementation article
- [Vercel Next.js Subscription Payments starter (GitHub)](https://github.com/vercel/nextjs-subscription-payments) — HIGH confidence, official Vercel template
- [Feature gating patterns in multi-tenant Next.js SaaS (Hacker News)](https://news.ycombinator.com/item?id=47262864) — MEDIUM confidence, community discussion
- [Social Media Scraping in 2025 (Scrapfly)](https://scrapfly.io/blog/posts/social-media-scraping-in-2025) — MEDIUM confidence, vendor blog
- [Inngest: How to solve Next.js timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts) — MEDIUM confidence, vendor blog with accurate technical content
