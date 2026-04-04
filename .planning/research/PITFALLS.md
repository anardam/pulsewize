# Domain Pitfalls

**Domain:** Multi-platform social media analytics SaaS (freemium, AI-powered, Vercel-deployed)
**Researched:** 2026-03-31
**Confidence:** HIGH (verified across official docs, CVE records, post-mortems)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, revenue leakage, or security incidents.

---

### Pitfall 1: Freemium Limit Enforcement as a Client-Side or Race-Prone Check

**What goes wrong:**
The usage counter ("3 free analyses/month") is read from the database, checked in application code, then the analysis runs, then the counter is incremented — all as separate steps. Under concurrent requests (two tabs, two devices, or an API client), both requests pass the check simultaneously before either increments the counter. A user effectively gets unlimited free analyses.

**Why it happens:**
The natural "check then act" pattern is not atomic. Serverless functions on Vercel each handle their own request independently with no shared memory. An in-memory rate limiter (the current `Map<string, RateLimitEntry>` in `src/lib/rate-limit.ts`) resets on every cold start and is not shared across concurrent invocations — it provides zero protection in production.

**Consequences:**
- Unlimited free usage drains Claude API credits (the primary cost driver).
- Revenue model collapses before it launches. AI API costs at $3/$15 per million tokens can reach hundreds of dollars per month with even moderate abuse.
- The existing in-memory rate-limit code gives false confidence that limits are enforced.

**Prevention:**
Use a single atomic database operation to increment and check in one step. In PostgreSQL (Supabase), this is an `UPDATE ... RETURNING` with a `WHERE usage_count < limit` clause — the row is only updated if the limit has not been reached, and the query returns no rows if it was. Never read-then-write in separate queries for limit enforcement.

```sql
-- Atomic increment: returns the updated row only if limit not exceeded
UPDATE user_usage
SET analyses_used = analyses_used + 1
WHERE user_id = $1
  AND billing_month = date_trunc('month', now())
  AND analyses_used < $2
RETURNING analyses_used;
```

If no row is returned, the limit was already reached — reject the request. Also replace the in-memory rate-limit with Supabase or Upstash Redis for cross-instance enforcement.

**Warning signs:**
- Usage counts that do not match analysis history
- Free-tier users reporting more analyses than expected
- Rate-limit code that uses JavaScript `Map` in a serverless context

**Phase:** Authentication + Freemium enforcement phase (foundational — build this before any usage meter is shown to users)

---

### Pitfall 2: Supabase service_role Key Exposed Client-Side Bypasses All RLS

**What goes wrong:**
A CVE (CVE-2025-48757) in 2025 affected 170+ production applications because AI-generated code used the `service_role` key in client-side or edge-middleware code. The `service_role` key bypasses Row Level Security entirely — any user who extracts it from browser requests or environment variables can read or write any row in the database.

**Why it happens:**
Supabase has two keys: `anon` (safe to expose, RLS applies) and `service_role` (never expose, bypasses RLS). The naming is not intuitive. Copy-paste from admin code examples into route handlers is easy.

**Consequences:**
- Any user can read all other users' reports, subscription status, and personal data.
- Users can set their own subscription tier to "pro" by directly updating the `users` table.
- A single leaked key exposes the entire database to anyone.

**Prevention:**
- `NEXT_PUBLIC_*` variables are visible in browser bundles — never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable.
- Use `service_role` only in server-side API routes that cannot be accessed by clients.
- Enforce RLS on every table — opt-in policy, not default-open. RLS is disabled by default in Supabase; you must enable it explicitly per table.
- Store subscription tier as a server-only field that is never directly client-writable.
- Verify subscription tier by calling `supabase.auth.getUser()` (which validates with the Supabase Auth server) — never `getSession()` alone (can be spoofed from cookies).

**Warning signs:**
- `SUPABASE_SERVICE_ROLE_KEY` appearing in any file with `NEXT_PUBLIC_` prefix
- Client-side Supabase client initialized with the service_role key
- RLS disabled on any table storing user data or subscription state

**Phase:** Authentication phase — RLS policies must be designed before tables are populated

---

### Pitfall 3: Vercel Function Timeout Kills Multi-Platform Analysis

**What goes wrong:**
The existing codebase already has this problem for Instagram alone: the sequential scraper fallback chain can take 30+ seconds, exceeding Vercel Hobby's 10s limit and approaching Vercel Pro's 60s limit. Adding 5 more platforms, multi-agent AI (multiple sequential Claude calls), and competitor comparison multiplies this by 3-10x. A competitor comparison across 2 profiles on 6 platforms with 3 Claude debate agents is structurally impossible as a single synchronous serverless function.

**Why it happens:**
Next.js API routes are synchronous request-response functions. There is no built-in mechanism for "start processing, return job ID, complete in background." The response must be sent within the timeout window or the connection is forcibly closed — leaving no result for the user and still consuming API credits up to the point of termination.

**Consequences:**
- Analysis silently fails with a 504 error. Users see a broken experience.
- Partial Claude API calls are billed even when the response is lost.
- Adding more platforms without changing the architecture makes this worse on every release.

**Prevention:**
Adopt a job-queue pattern before building multi-platform support:
1. POST to `/api/analyze` creates a job record in Supabase with status `pending`, returns `{ jobId }` immediately (sub-100ms).
2. A background worker (Inngest, Vercel Fluid Compute with `waitUntil`, or a Vercel Cron that polls) processes the job asynchronously.
3. Client polls `/api/jobs/[jobId]` for status, or use Supabase Realtime to push updates.

Inngest is the most practical choice: it integrates with Vercel, handles retries, and lets each step (scrape, analyze, synthesize) run as its own function with its own timeout.

**Warning signs:**
- Any analysis route that does more than 2 external API calls in sequence
- Scraper timeouts that approach 15-20s individually
- `maxDuration` not set in route config

**Phase:** Must be solved in the architecture phase before multi-platform scraping is built — retrofitting is expensive

---

### Pitfall 4: Multi-Agent "Debate" Token Cost Explosion

**What goes wrong:**
A naive implementation of 3 Claude agents debating and synthesizing accumulates the full conversation history in each agent's context. A 4-agent debate with 5 rounds is 20 LLM calls minimum, each with an ever-growing context. At Sonnet pricing ($3/$15 per million tokens), a single "debate" analysis can cost $0.50-$2.00 per user request. With even 100 free-tier users running one analysis each, that is $50-$200 in AI costs before any revenue.

**Why it happens:**
Multi-agent debate frameworks pass the entire conversation thread to each agent on each turn. Long system prompts (detailing analysis framework, platform context) plus growing debate history plus input profile data creates compound context growth. Each output also tends to be verbose because agents are rewarded by the prompt for thoroughness.

**Consequences:**
- AI cost per analysis exceeds subscription revenue at scale.
- Free tier becomes financially unsustainable before conversion happens.
- Cost scales superlinearly with number of agents and debate rounds.

**Prevention:**
- Use summarized debate outputs as inputs to subsequent agents, not raw full transcripts.
- Limit debate to a single round: each agent analyzes independently, an orchestrator synthesizes — no back-and-forth.
- Use Haiku 4.5 ($1/$5 per million tokens) for the independent analysis agents; reserve Sonnet for final synthesis only. This cuts per-analysis cost by ~66%.
- Set hard `max_tokens` limits on each agent response (e.g., 1500 tokens max per agent).
- Cache analysis results for identical profile data (hash profile fields) — the same profile analyzed twice within 1 hour reuses the cached result.
- Use Anthropic Batch API (50% discount) for non-time-sensitive analyses.

**Warning signs:**
- No `max_tokens` set on agent API calls
- Full conversation history passed to each agent
- No per-analysis cost logging
- Cost per analysis not measured before launch

**Phase:** AI multi-agent architecture phase — cost model must be validated on paper before implementation

---

### Pitfall 5: Dual Payment Provider State Divergence

**What goes wrong:**
Stripe and Razorpay each maintain their own subscription state. If a webhook fails (network error, server restart, unhandled exception), Stripe's records say "subscription active" but your Supabase database says "free tier" (or vice versa). The user paid but cannot access premium features. Support tickets accumulate. Worse: a user cancels in Razorpay but your database never receives the webhook, so they continue to get premium access indefinitely.

**Why it happens:**
Webhook delivery is at-most-once by default. Both Stripe and Razorpay retry failed webhooks with exponential backoff, but if your handler throws an exception or returns a non-2xx response, retries keep firing and can replay events 24-72 hours later. Razorpay subscriptions additionally enter a `halted` state after 4 failed retries (T+0 through T+3 days) with no further automatic recovery.

**Consequences:**
- Revenue leakage: users access premium features without paying.
- User frustration: users who paid are locked out.
- Double-processing: a webhook replayed after 24 hours fires a "subscription activated" event again and increments counters or sends duplicate welcome emails.

**Prevention:**
- Idempotency is mandatory: store processed webhook event IDs (Stripe's `evt_*`, Razorpay's event ID) in a `processed_webhooks` table with a unique constraint. Check before acting. Return 200 immediately if already processed.
- Never trust client-side payment confirmation. The frontend's "payment success" callback is advisory only. Only update subscription state from server-side webhook events.
- Use a single `subscriptions` table in Supabase with a `provider` column (`stripe` | `razorpay`). Never have separate tables per provider.
- Verify Razorpay payment signatures on every order: `razorpay_signature` must be validated server-side using HMAC-SHA256 before updating subscription state.
- Log every webhook event to an `events` table regardless of whether it triggers an action — essential for debugging state divergence.

**Warning signs:**
- Webhook handler that does not check for duplicate event IDs
- Subscription state updated from client-side payment success callback
- No `events` audit table
- Separate database tables for Stripe vs Razorpay subscriptions

**Phase:** Payments phase — implement idempotency before going live, not after first incident

---

## Moderate Pitfalls

---

### Pitfall 6: Social Platform API Silent Breaks

**What goes wrong:**
Instagram, TikTok, LinkedIn, and Facebook all actively block scraping. Changes to their internal APIs or anti-bot measures happen with no warning and no changelog. The existing scraper breaks silently — the fallback chain exhausts all strategies and returns an empty result or a misleading error, but the application does not alert anyone. The project's existing experience with Instagram's `web_profile_info` endpoint being "frequently blocked" will repeat on every platform.

**Why it happens:**
Unofficial APIs and scraping rely on implementation details that platform engineers actively change to prevent automation. RapidAPI third-party scrapers add another failure point — providers disappear, change their response schema, or raise prices without notice.

**Consequences:**
- Core product functionality (the analysis) becomes unreliable on specific platforms.
- Users blame the product, not the platform. Churn increases.
- No visibility: without alerting, scraper failures accumulate silently for days.

**Prevention:**
- Implement a platform health check endpoint that runs a canary scrape for each platform every 15 minutes using Vercel Cron. Write status to Supabase. Surface status in the UI before users start an analysis.
- Design the scraper cascade to log the specific failure mode (not just the final error) — which strategy failed, what HTTP status or error was returned. This exists as a concern in CONCERNS.md but is not yet implemented.
- Manual data entry must be a first-class UX path, not a degraded fallback. When a platform is down, direct users to manual entry without implying failure.
- For LinkedIn and Facebook specifically: treat official API access as the primary path and scraping as the fallback, not the reverse. Both platforms have official marketing/developer APIs with defined rate limits that are more stable than screen scraping.

**Warning signs:**
- No platform health monitoring dashboard
- Scraper errors logged only as strings (stack traces discarded)
- Manual entry UX treated as an error state rather than a valid flow

**Phase:** Per-platform integration phases — implement the canary monitor before each platform launches in production

---

### Pitfall 7: Supabase Free Tier Pauses and Scale Cliff

**What goes wrong:**
Supabase free tier projects are automatically paused after 7 days of inactivity. This is a non-issue for active apps, but it creates a specific problem during development: after a weekend, the project is paused and the Monday morning test deployment silently fails with auth errors until someone manually unpauses the project. More critically, the free tier has hard limits (500 MB database, 50,000 MAU, 5 GB bandwidth) that create a sudden cliff — when exceeded, the project either stops working or incurs unexpected charges.

**Why it happens:**
Supabase free tier is designed for prototyping, not production SaaS. The auto-pause feature is intentional resource management by Supabase. The limits are generous for a side project but can be hit quickly if stored analysis reports are large JSON blobs.

**Consequences:**
- Development/staging environment goes dark after a week of inactivity.
- Large analysis reports (multi-platform, competitor comparison) can be 50-100 KB each; 10,000 stored reports reaches 500 MB-1 GB quickly.
- 50,000 MAU limit sounds large but counts monthly active users, not registered users.

**Prevention:**
- Store analysis reports in Supabase Storage (file-based, 1 GB free) rather than the database, or compress/truncate stored JSON. Keep only the structured metadata in the database; store the full report as a file.
- Budget for Supabase Pro ($25/month) from the start of the paid tier launch. The free tier is appropriate for development; plan the upgrade trigger.
- Use separate Supabase projects for development and production to prevent dev activity from consuming production quotas.

**Warning signs:**
- Analysis reports stored as full JSON in a `jsonb` column without size limits
- Single Supabase project used for both development and production
- No database size monitoring

**Phase:** Database design phase — storage strategy must be decided before report persistence is built

---

### Pitfall 8: OAuth Redirect Session Flicker and Token Loss

**What goes wrong:**
Supabase OAuth (Google sign-in) redirects the user back to the app with auth tokens as URL hash fragments (`#access_token=...`). Hash fragments are not sent to the server — they exist only in the browser. The Next.js App Router server-renders the page before the Supabase client-side code runs and processes the hash. This causes a flash of the login screen before the user is redirected to their dashboard. More critically, if the middleware session refresh is misconfigured or `@supabase/auth-helpers` (deprecated) is used instead of `@supabase/ssr`, the token is lost on the first server navigation.

**Why it happens:**
The `@supabase/auth-helpers` package is deprecated but still referenced in many tutorials. The replacement is `@supabase/ssr`. Mixing old and new package patterns causes session cookie inconsistencies. The middleware must correctly call `supabase.auth.getUser()` and propagate refreshed tokens via `response.cookies.set` — missing this step means every server-rendered page sees the user as unauthenticated even after OAuth completes.

**Consequences:**
- Users complete Google sign-in and land on the login page again.
- Sessions expire unexpectedly mid-session.
- Premium feature checks on the server see an unauthenticated user and deny access.

**Prevention:**
- Use `@supabase/ssr` exclusively — not `@supabase/auth-helpers`.
- Implement the middleware pattern exactly as documented: create a Supabase client that reads and writes cookies, call `getUser()` to refresh the session, and ensure `response.cookies` changes are propagated.
- Never call `getSession()` in Server Components to check if a user is authenticated — it reads from cookies which can be tampered with. Use `getUser()` which validates with the Supabase Auth server.
- Test OAuth flow with a fresh incognito window and hard-reload after redirect to confirm the session persists.

**Warning signs:**
- `@supabase/auth-helpers` in package.json
- Middleware that creates a Supabase client but does not propagate response cookies
- `getSession()` used in server-side authorization checks

**Phase:** Authentication phase — use correct package from day one; migrating from auth-helpers to ssr after the fact is non-trivial

---

### Pitfall 9: Disposable Email Freemium Abuse

**What goes wrong:**
Free-tier analysis limits are per-account. A user creates 10 accounts with 10 disposable email addresses and runs 30 free analyses (3 per account). Each analysis costs real Claude API money. For a social media analytics tool targeting creators who want to game their metrics, this demographic is particularly motivated to find such workarounds. Research shows ~33% of freemium signups use disposable email domains.

**Why it happens:**
Email/password signup with no verification friction is trivially abusable. Google OAuth is harder to abuse (requires real Google accounts) but not impossible.

**Consequences:**
- Claude API cost increases proportionally with abuse volume.
- Legitimate conversion rate metrics are distorted by fake accounts.
- Supabase MAU limit is consumed by ghost accounts.

**Prevention:**
- Block known disposable email domains at signup using a maintained blocklist (libraries like `disposable-email-domains` on npm, updated regularly).
- Require email verification before the first analysis runs — not after signup, before use.
- Treat Google OAuth as a stronger signal of legitimacy; offer the first analysis only after OAuth or verified email, not immediately on signup.
- Device fingerprinting (using a library like FingerprintJS) can link multiple accounts to the same browser without requiring personal data.
- Log abuse patterns (multiple signups from same IP, same device fingerprint) to identify campaigns rather than individual offenders.

**Warning signs:**
- Email verification not required before first analysis
- No disposable email domain check at signup
- Unusual spike in signups from free email providers

**Phase:** Authentication + Freemium phase — implement blocklist and email verification before launching public signup

---

## Minor Pitfalls

---

### Pitfall 10: Hardcoded Claude Model Name Causes Silent Degradation

**What goes wrong:**
`claude-sonnet-4-20250514` is hardcoded in `src/lib/claude-api.ts`. When Anthropic releases a better model (as they do every few months) and you want to upgrade, it requires a code change and deployment. More critically, if Anthropic deprecates this model version and removes it from the API, all analysis calls silently fail with an API error rather than gracefully falling back.

**Prevention:**
Move to `process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514"`. This is already flagged in CONCERNS.md. For multi-agent use, also parameterize the worker model (`CLAUDE_WORKER_MODEL` for Haiku) separately from the orchestrator model.

**Phase:** Any phase — quick fix, address in the first development sprint

---

### Pitfall 11: Content Calendar Generation Prompt Inflation

**What goes wrong:**
AI-generated content calendars (30-day, weekly posting schedules) tend to produce very large outputs because the model generates an entry for each day. At 30 entries × 200 tokens each, the output alone is 6,000 tokens per calendar ($0.09 at Sonnet pricing). Multiplied across a debate architecture, this becomes a meaningful cost per user.

**Prevention:**
Request structured minimal output: dates + post_type + topic + hashtags only (no full copy). Full copy generation should be a separate, on-demand expansion step triggered by the user, not generated speculatively for the entire calendar.

**Phase:** Content calendar feature phase

---

### Pitfall 12: Razorpay Not Suitable for All International Markets

**What goes wrong:**
Razorpay processes payments in Indian Rupees (INR) and is designed for the Indian market. International cards work but with lower success rates and potential currency conversion friction. The dual-provider model (Stripe for international, Razorpay for India) assumes clean geographic routing — but users with Indian IP addresses who prefer USD payments, or Indian diaspora abroad, create ambiguous cases.

**Prevention:**
Route by user preference at checkout, not by IP geolocation. Show both options or let users choose. Default to Stripe for non-India billing addresses; default to Razorpay when billing address is India. Do not use IP-based routing as the sole determinant.

**Phase:** Payments phase

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Authentication (Supabase) | service_role key exposed, getSession() trusted, auth-helpers deprecated package | Use @supabase/ssr, getUser() in server components, RLS on all tables |
| Freemium enforcement | Race condition on usage counter, in-memory rate limit ineffective | Atomic DB increment, Upstash Redis or Supabase-backed rate limiter |
| Multi-agent AI design | Token cost explosion from debate accumulation | Single-round architecture, Haiku for workers, max_tokens caps, result caching |
| Vercel architecture for long jobs | Function timeout with parallel scraping + multi-agent calls | Job queue pattern (Inngest or Vercel Fluid), return jobId immediately |
| Per-platform scraper (each) | Silent breaks, no health monitoring | Canary cron per platform, structured failure logging, manual entry as first-class path |
| Payments (Stripe + Razorpay) | Webhook state divergence, duplicate event processing | Idempotency table, signature verification, unified subscriptions table |
| Free signup funnel | Disposable email abuse, multi-account gaming | Disposable domain blocklist, email verification before first use |
| Report persistence | Large JSON blobs exhaust Supabase free tier DB | Store reports in Supabase Storage, metadata only in DB |
| Content calendar generation | Output token bloat per calendar | Structured minimal output, expand-on-demand pattern |

---

## Sources

- [Supabase RLS CVE-2025-48757 — 170+ apps exposed](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase Auth with Next.js App Router — official docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase troubleshooting Next.js auth issues](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV)
- [Supabase pricing and free tier limits 2026](https://uibakery.io/blog/supabase-pricing)
- [Vercel function timeouts — official KB](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)
- [Long-running background functions on Vercel — Inngest](https://www.inngest.com/blog/vercel-long-running-background-functions)
- [Multi-agent "bag of agents" error trap — Towards Data Science](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/)
- [Multi-agent production patterns 2026 — Chanl](https://www.chanl.ai/blog/multi-agent-orchestration-patterns-production-2026)
- [Anthropic API pricing — official](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude API cost optimization strategies — Finout](https://www.finout.io/blog/anthropic-api-pricing)
- [Razorpay subscription payment retries — official docs](https://razorpay.com/docs/payments/subscriptions/payment-retries/)
- [Why Razorpay payments fail randomly — DEV Community](https://dev.to/vjygour/why-razorpay-payments-fail-randomly-and-how-i-actually-debug-them-26hp)
- [Stripe webhook integration pitfalls](https://www.f22labs.com/blogs/webhook-integration-with-stripe-payment-intents/)
- [Race condition free-plan bypass — post-mortem](https://medium.com/@mhmodgm54/race-condition-chained-with-logic-bug-leads-to-full-bypass-of-free-plan-site-limit-5825f5e2cb1c)
- [Free tier SaaS abuse — Trueguard](https://trueguard.io/blog/what-is-free-tier-abuse-and-how-saas-can-prevent-it)
- [Social media scraping in 2025 — Scrapfly](https://scrapfly.io/blog/posts/social-media-scraping-in-2025)
- [What happens when platforms catch you scraping — ScrapeCreators](https://scrapecreators.com/blog/what-happens-when-social-media-companies-catch-you-scraping-a-platform-by-platform-guide)
- [Headless Chrome on Vercel cold starts — DEV Community](https://dev.to/andreas_a/headless-chrome-on-vercel-build-a-screenshot-api-that-survives-cold-starts-ce8)
