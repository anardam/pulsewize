# Phase 3: Payments and Gating - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement Razorpay-only subscription payments (global, not India-only), freemium gating (3 free analyses/month enforced atomically), upgrade prompt on the analyze page, webhook handler for subscription state, and billing UI on the Settings page. Stripe is NOT used — Razorpay is the sole payment provider.

</domain>

<decisions>
## Implementation Decisions

### Payment Provider
- **D-01:** Razorpay ONLY — no Stripe. Razorpay handles all regions globally. Merchant needs an Indian bank account for payouts.
- **D-02:** Drop all Stripe references from PROJECT.md and REQUIREMENTS.md — single payment provider simplifies everything.

### Pricing Tiers
- **D-03:** Two tiers only: Free and Pro
- **D-04:** Free tier: 3 analyses per month, single-agent AI reports, all platforms
- **D-05:** Pro tier: unlimited analyses + multi-agent AI (Phase 4), competitor comparison (Phase 4), content calendar (Phase 4), growth tracking (Phase 5)
- **D-06:** Pro pricing: $19.99/month, truly unlimited analyses (no cap). Higher price absorbs heavy AI usage cost. Phase 4 will optimize agent costs (Haiku for workers). If heavy usage becomes a problem post-launch, add a soft limit later — not now.

### Checkout Flow
- **D-07:** Upgrade prompt appears INLINE on the analyze page when free user hits 3/3 limit — "You've used 3/3 free analyses. Upgrade to Pro for unlimited." with upgrade button
- **D-08:** Razorpay Standard Checkout (popup modal with UPI, cards, wallets) — no redirect away from the app
- **D-09:** Subscription-based billing (recurring monthly), not one-time payment

### Webhook & State Management
- **D-10:** Server-side webhooks ONLY modify subscription state — client-side payment callbacks never change access level
- **D-11:** Webhook handler with idempotency (deduplicate by payment_id)
- **D-12:** Subscription events (created, activated, halted, cancelled, completed) update the `subscriptions` table in Supabase

### Settings Billing UI
- **D-13:** Settings page billing section shows: current plan (Free/Pro), analyses used this month, upgrade/downgrade button, payment history (invoices with dates/amounts), cancel subscription with confirmation dialog
- **D-14:** Self-service cancellation — user can cancel from Settings without contacting support

### Phase 4 Forward Decision (Multi-Agent AI)
- **D-15:** Multi-agent debate uses 3 DIFFERENT AI providers: Claude + ChatGPT (OpenAI) + Gemini (Google). Genuinely diverse perspectives, not 3 Claude agents with different prompts.
- **D-16:** Synthesis done by the best-performing agent (not always Claude). Evaluate quality and let the strongest response drive the final report.
- **D-17:** This means Phase 4 needs: OpenAI API key (OPENAI_API_KEY), Google AI API key (GOOGLE_AI_API_KEY), plus existing ANTHROPIC_API_KEY.

### Claude's Discretion
- Razorpay plan_id creation strategy (pre-created vs dynamic)
- Webhook signature verification implementation
- Razorpay subscription lifecycle state machine details
- Whether to offer annual billing with discount (v1 can be monthly-only)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, constraints (update to remove Stripe references)
- `.planning/REQUIREMENTS.md` — PAY-01 through PAY-06 (update PAY-01 to Razorpay-only)
- `.planning/ROADMAP.md` — Phase 3 success criteria

### Phase 1 Foundation (existing infrastructure)
- `src/lib/supabase/schema.sql` — `subscriptions` and `usage` tables already exist with RLS
- `src/app/api/analyze/route.ts` — Already calls `check_and_increment_usage()` RPC
- `src/app/(dashboard)/settings/page.tsx` — Settings page stub (billing section to be added)
- `src/app/(dashboard)/analyze/page.tsx` — Where upgrade prompt appears on limit hit

### Research (project-level)
- `.planning/research/PITFALLS.md` — Razorpay webhook reliability, halted state, idempotency

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `subscriptions` Supabase table — already has plan, status, provider, current_period_start/end columns
- `usage` table + `check_and_increment_usage()` RPC — freemium enforcement already working
- Settings page stub — has account info card + danger zone, needs billing section added
- Analyze page — already shows usage count, needs upgrade prompt when limit hit

### Established Patterns
- Supabase RPC for atomic operations
- API routes with `{ success, data, error }` envelope
- Dark theme with CSS variables
- Server components for data fetching, client components for interactivity

### Integration Points
- `src/app/api/webhooks/razorpay/route.ts` — new webhook endpoint
- `src/app/api/checkout/route.ts` — new checkout session creation endpoint
- `src/app/(dashboard)/settings/page.tsx` — add billing section
- `src/app/(dashboard)/analyze/page.tsx` — add upgrade prompt on limit
- `.env.local` — RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET

</code_context>

<specifics>
## Specific Ideas

- Upgrade prompt should feel encouraging, not punishing — "Unlock unlimited analyses" not "You've hit your limit"
- Razorpay popup should match dark theme as much as possible (Razorpay supports theme customization)
- Payment history should be clean and minimal — date, amount, status

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-payments-and-gating*
*Context gathered: 2026-03-31*
