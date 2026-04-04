# Phase 3: Payments and Gating - Research

**Researched:** 2026-03-31
**Domain:** Razorpay Subscriptions, Next.js App Router checkout integration, freemium gating
**Confidence:** HIGH (verified against official Razorpay docs, razorpay-node SDK, npm registry, PITFALLS.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Razorpay ONLY — no Stripe. Razorpay handles all regions globally. Merchant needs an Indian bank account for payouts.
- **D-02:** Drop all Stripe references from PROJECT.md and REQUIREMENTS.md — single payment provider simplifies everything.
- **D-03:** Two tiers only: Free and Pro
- **D-04:** Free tier: 3 analyses per month, single-agent AI reports, all platforms
- **D-05:** Pro tier: unlimited analyses + multi-agent AI (Phase 4), competitor comparison (Phase 4), content calendar (Phase 4), growth tracking (Phase 5)
- **D-06:** Pro pricing: $19.99/month, truly unlimited analyses (no cap).
- **D-07:** Upgrade prompt appears INLINE on the analyze page when free user hits 3/3 limit — encouraging copy ("Unlock unlimited analyses"), not punishing.
- **D-08:** Razorpay Standard Checkout (popup modal with UPI, cards, wallets) — no redirect away from the app
- **D-09:** Subscription-based billing (recurring monthly), not one-time payment
- **D-10:** Server-side webhooks ONLY modify subscription state — client-side payment callbacks never change access level
- **D-11:** Webhook handler with idempotency (deduplicate by payment_id)
- **D-12:** Subscription events (created, activated, halted, cancelled, completed) update the `subscriptions` table in Supabase
- **D-13:** Settings page billing section shows: current plan (Free/Pro), analyses used this month, upgrade/downgrade button, payment history (invoices with dates/amounts), cancel subscription with confirmation dialog
- **D-14:** Self-service cancellation — user can cancel from Settings without contacting support

### Claude's Discretion
- Razorpay plan_id creation strategy (pre-created vs dynamic)
- Webhook signature verification implementation
- Razorpay subscription lifecycle state machine details
- Whether to offer annual billing with discount (v1 can be monthly-only)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | Razorpay subscription integration (replaces old "Stripe" entry) | Razorpay SDK v2.9.6, subscription API, plan_id strategy documented below |
| PAY-02 | Razorpay subscription for UPI, local cards, global cards | Razorpay Standard Checkout handles all payment methods; international payments require account-level enablement |
| PAY-03 | Freemium gating — 3 free analyses/month, advanced features gated to paid | check_and_increment_usage() RPC already enforces; analyze route needs plan-aware limit (pass 999999 for Pro) |
| PAY-04 | Usage dashboard — remaining analyses, current plan, upgrade prompts | Settings billing section + inline analyze page prompt; data from subscriptions + usage tables |
| PAY-05 | Webhook handler for Razorpay with idempotency | x-razorpay-event-id header for deduplication; validateWebhookSignature() from razorpay SDK |
| PAY-06 | Subscription state synced to Supabase subscriptions table | subscriptions table already exists; webhook events map directly to status column |
</phase_requirements>

---

## Summary

Phase 3 adds Razorpay-only recurring subscription billing to SocialLens. The foundation is already solid: the `subscriptions` and `usage` tables exist in Supabase, `check_and_increment_usage()` enforces the free tier atomically, and the analyze route already returns HTTP 429 with the upgrade message. This phase wires up the payment layer on top of that foundation.

The integration pattern is: (1) pre-create a Razorpay plan in the dashboard (immutable once created), (2) create a subscription per user via server-side API route, (3) open Razorpay Standard Checkout popup with `subscription_id` (not `order_id`), (4) after payment, ignore the client callback for access elevation and wait for the `subscription.charged` webhook to confirm and set `plan = 'pro'` in Supabase. The webhook handler verifies the `x-razorpay-signature` using HMAC-SHA256 and deduplicates using `x-razorpay-event-id`.

**Critical currency finding:** Razorpay subscription plans are created in a single currency. USD support for plan creation requires international payments to be enabled on the Razorpay account dashboard — it is an account-level permission, not an API limitation. The plan must be created with `currency: "USD"` and `amount: 1999` (cents). If the account does not have international payments enabled, plan creation will fail with "Currency provided is not supported." Verify this in the Razorpay dashboard under Settings > International Payments before attempting plan creation.

**Primary recommendation:** Pre-create the Pro plan once in the Razorpay dashboard (not dynamically), store the resulting `plan_id` as `RAZORPAY_PLAN_ID` env var, and create a new subscription per checkout attempt. This matches Razorpay's intended immutable-plan model and avoids orphaned plans.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| razorpay | 2.9.6 | Official Node.js SDK — creates plans, subscriptions, validates signatures | Official Razorpay SDK; `validateWebhookSignature()` built-in |
| next/script | (Next.js built-in) | Load `checkout.js` in client components | App Router safe script loading; avoids manual DOM injection |
| node:crypto | (Node built-in) | HMAC-SHA256 for webhook signature fallback | No extra dependency; razorpay SDK uses it internally |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod (already installed) | ^4.3.6 | Validate webhook payload shape before processing | Webhook handler — narrow `unknown` body safely |
| @supabase/supabase-js (already installed) | ^2.100.1 | Write subscription state from webhook handler | Use service_role key in webhook route only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| razorpay npm SDK | Raw fetch to Razorpay REST API | SDK adds type safety and `validateWebhookSignature()`; prefer SDK |
| next/script | useEffect + DOM script injection | next/script is the idiomatic App Router approach; less error-prone |
| Pre-created plan | Dynamically create plan per checkout | Razorpay plans are immutable once created — pre-create is cleaner; avoid cluttering plan list |

**Installation:**
```bash
npm install razorpay
```

**Version verification:** `npm view razorpay version` returns `2.9.6` (verified 2026-03-31).

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates:

```
src/
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts          # POST: create Razorpay subscription, return subscription_id
│   │   └── webhooks/
│   │       └── razorpay/
│   │           └── route.ts      # POST: handle Razorpay webhook events
│   └── (dashboard)/
│       └── settings/
│           └── page.tsx          # Add billing section (plan, usage, history, cancel)
├── components/
│   ├── billing/
│   │   ├── UpgradePrompt.tsx     # Inline upgrade prompt for analyze page (client)
│   │   ├── BillingSection.tsx    # Settings billing card (client)
│   │   └── CancelDialog.tsx      # Confirmation dialog for cancellation (client)
│   └── settings/
│       └── DeleteAccountButton.tsx  (existing)
└── lib/
    ├── razorpay/
    │   ├── client.ts             # Razorpay SDK instance (server-only)
    │   └── types.ts              # Razorpay webhook payload types
    └── supabase/
        └── schema.sql            # Add: processed_webhook_events table
```

### Pattern 1: Subscription Checkout Flow

**What:** Client requests a subscription_id from the server, then opens the Razorpay popup with that ID. Server never grants access from the client callback.

**When to use:** Every time a free user clicks "Upgrade to Pro"

```typescript
// Source: Razorpay integration guide + razorpay-node SDK docs
// --- SERVER: src/app/api/checkout/route.ts ---
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

  const subscription = await razorpay.subscriptions.create({
    plan_id: process.env.RAZORPAY_PLAN_ID!,
    total_count: 120,          // 10 years of billing cycles
    quantity: 1,
    customer_notify: 1,
    notes: { user_id: user.id },  // stored for webhook correlation
  });

  return NextResponse.json({ success: true, subscriptionId: subscription.id });
}

// --- CLIENT: src/components/billing/UpgradePrompt.tsx ---
"use client";
import Script from "next/script";

export function UpgradePrompt() {
  async function handleUpgrade() {
    const res = await fetch("/api/checkout", { method: "POST" });
    const { subscriptionId } = await res.json();

    const rzp = new (window as any).Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      subscription_id: subscriptionId,   // NOT order_id — subscriptions use subscription_id
      name: "SocialLens",
      description: "Pro Plan — Unlimited Analyses",
      theme: { color: "#7c3aed" },       // violet-700 matches brand
      handler: function (response: any) {
        // Advisory only — DO NOT update subscription state here
        // State is updated only after webhook confirms
        window.location.reload();        // Refresh to pick up new status from DB
      },
    });
    rzp.open();
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="...">
        <p>Unlock unlimited analyses</p>
        <button onClick={handleUpgrade}>Upgrade to Pro</button>
      </div>
    </>
  );
}
```

### Pattern 2: Webhook Handler with Idempotency

**What:** Webhook route verifies signature, deduplicates by event ID, then updates Supabase.

**When to use:** Razorpay subscription state changes (activated, charged, halted, cancelled, completed)

```typescript
// Source: Razorpay webhook docs + razorpay-node validateWebhookSignature
// src/app/api/webhooks/razorpay/route.ts
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  // 1. Read raw body (MUST be raw — not parsed JSON — for signature validation)
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";

  // 2. Verify signature
  const isValid = Razorpay.validateWebhookSignature(
    rawBody,
    signature,
    process.env.RAZORPAY_WEBHOOK_SECRET!
  );
  if (!isValid) return new Response("Forbidden", { status: 403 });

  // 3. Parse payload
  const payload = JSON.parse(rawBody);
  const { event, payload: eventPayload } = payload;

  // 4. Idempotency check — return 200 if already processed
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: existing } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single();
  if (existing) return new Response("Already processed", { status: 200 });

  // 5. Process event
  const sub = eventPayload?.subscription?.entity;
  if (!sub) return new Response("OK", { status: 200 });

  const userId = sub.notes?.user_id;
  if (!userId) return new Response("OK", { status: 200 });

  if (event === "subscription.charged") {
    await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan: "pro",
      provider: "razorpay",
      provider_subscription_id: sub.id,
      status: "active",
      current_period_end: new Date(sub.current_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  } else if (event === "subscription.halted") {
    await supabase.from("subscriptions").update({
      status: "halted",
      updated_at: new Date().toISOString(),
    }).eq("provider_subscription_id", sub.id);
  } else if (event === "subscription.cancelled" || event === "subscription.completed") {
    await supabase.from("subscriptions").update({
      plan: "free",
      status: event === "subscription.cancelled" ? "cancelled" : "completed",
      updated_at: new Date().toISOString(),
    }).eq("provider_subscription_id", sub.id);
  }

  // 6. Record event as processed (idempotency log)
  await supabase.from("processed_webhook_events").insert({
    event_id: eventId,
    event_type: event,
    processed_at: new Date().toISOString(),
  });

  return new Response("OK", { status: 200 });
}
```

### Pattern 3: Plan-Aware Usage Enforcement

**What:** The `check_and_increment_usage()` RPC accepts a `p_limit` parameter. Pro users get a very high limit (effectively unlimited). The analyze route reads the user's plan from `subscriptions` before calling the RPC.

**When to use:** Every analyze request

```typescript
// src/app/api/analyze/route.ts — add after auth check
const { data: subData } = await supabase
  .from("subscriptions")
  .select("plan, status")
  .eq("user_id", user.id)
  .single();

const isPro =
  subData?.plan === "pro" &&
  (subData?.status === "active" || subData?.status === "authenticated");

const usageLimit = isPro ? 999999 : 3;

const { data: usageData } = await supabase.rpc("check_and_increment_usage", {
  p_user_id: user.id,
  p_limit: usageLimit,
});
```

### Pattern 4: Subscription Signature Verification (checkout handler)

**What:** After the popup closes, the client receives `razorpay_payment_id` + `razorpay_subscription_id` + `razorpay_signature`. To verify authenticity (advisory — not used to grant access), the HMAC format for subscriptions differs from orders.

```typescript
// Subscription signature format (DIFFERENT from order payments):
// HMAC-SHA256(key_secret, razorpay_payment_id + "|" + razorpay_subscription_id)
const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
const expectedSignature = crypto
  .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
  .update(body)
  .digest("hex");
// expectedSignature should === razorpay_signature

// OR use the SDK:
Razorpay.validatePaymentVerification(
  { subscription_id: razorpay_subscription_id, payment_id: razorpay_payment_id },
  razorpay_signature,
  process.env.RAZORPAY_KEY_SECRET!
);
```

### Anti-Patterns to Avoid

- **Updating subscription state from the client handler:** The `handler` callback in the Razorpay options object fires on the client. Never call an API route from there that sets `plan = 'pro'` — this is trivially forgeable. Only webhooks set plan state.
- **Passing `order_id` to subscription checkout:** Subscriptions use `subscription_id`, not `order_id`. The two flows are mutually exclusive.
- **Creating plans dynamically per user:** Plans are immutable once created in Razorpay and cannot be deleted. Pre-create once in the dashboard, store as `RAZORPAY_PLAN_ID`.
- **Parsing the webhook body before signature verification:** The `x-razorpay-signature` is computed over the raw request body. Calling `request.json()` first and then re-stringifying may produce a different string. Always use `request.text()` and verify before parsing.
- **Using `getSession()` in the analyze route for plan checks:** Use `getUser()` (verifies with auth server). `getSession()` reads from cookies and can be tampered with.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC-SHA256 webhook verification | Custom crypto implementation | `Razorpay.validateWebhookSignature()` from razorpay SDK | SDK handles raw body encoding correctly; reduces bugs |
| Payment popup loading | Manual script injection via `useEffect` + DOM API | `next/script` with `<Script src="https://checkout.razorpay.com/v1/checkout.js" />` | App Router safe; handles cleanup |
| Webhook deduplication | Custom UUID table with manual queries | `processed_webhook_events` table + unique constraint on `event_id` | Database uniqueness constraint is atomic; application-level checks race |
| Subscription state machine | Custom status tracking logic | Map Razorpay webhook events directly to `subscriptions.status` column | Razorpay is the source of truth; mirror don't invent |
| Usage counter reset | Custom cron job or manual reset | Existing `check_and_increment_usage()` RPC with `billing_month = date_trunc('month', now())` | Already implemented atomically in Phase 1 |

**Key insight:** Razorpay manages the subscription state machine. The app's job is to mirror that state in Supabase via webhooks, not to compute it independently.

---

## Common Pitfalls

### Pitfall 1: USD Plans Require Account-Level International Payments Enablement

**What goes wrong:** Plan creation with `currency: "USD"` fails with "Currency provided is not supported" even though the API accepts a currency parameter.

**Why it happens:** Razorpay requires merchants to explicitly enable international payments in their dashboard (Settings > International Payments). This is an account permission, not an API limitation. The error appears at plan creation time, not at checkout time.

**How to avoid:** Before writing any code, log into the Razorpay dashboard and verify international payments are enabled. Create the plan manually in the dashboard UI first to confirm USD works, then note the `plan_id`.

**Warning signs:** Plan creation API call returns 400 with currency error during Wave 0 setup.

---

### Pitfall 2: Raw Body Must Be Used for Webhook Signature Verification

**What goes wrong:** Webhook signature verification fails consistently or intermittently, causing all webhooks to be rejected as invalid.

**Why it happens:** The `x-razorpay-signature` header is HMAC-SHA256 computed over the raw bytes of the request body. If you call `request.json()` then `JSON.stringify()` the result to verify, whitespace differences or key ordering changes can produce a different string and a different HMAC.

**How to avoid:** Always use `request.text()` to get the raw body string. Verify signature before calling `JSON.parse()`. Pass the same raw string to `Razorpay.validateWebhookSignature()`.

**Warning signs:** Signatures always fail in staging but webhooks were manually confirmed as correct in Razorpay dashboard.

---

### Pitfall 3: Halted Subscriptions Must Not Lose Pro Access Immediately

**What goes wrong:** A subscription enters `halted` state (payment failed after retries). If the app immediately downgrades the user to `free`, they lose access mid-billing-period and are angry. Razorpay retries payments for several days before the subscription halts.

**Why it happens:** Mapping `subscription.halted` event to `plan = 'free'` is an overly aggressive response. Halted means payment is failing, but the subscription is not yet cancelled.

**How to avoid:** On `subscription.halted`, set `status = 'halted'` but keep `plan = 'pro'`. Give the user a grace period (e.g., show a payment update banner). Only set `plan = 'free'` on `subscription.cancelled` or `subscription.completed`. The user can re-authenticate their payment method and the subscription transitions back to `active` automatically.

**Warning signs:** Users report losing Pro access even though they "just had a payment issue" and resolved it.

---

### Pitfall 4: Razorpay Webhooks Are at-Least-Once Delivery

**What goes wrong:** A `subscription.charged` event fires, the webhook handler processes it, updates Supabase, but takes slightly over 5 seconds to respond. Razorpay marks the delivery as timed out and replays the event. The handler processes it again, potentially creating duplicate records or double-charging welcome emails.

**Why it happens:** Razorpay's 5-second response timeout is strict. Any database writes or external calls within the webhook handler extend response time.

**How to avoid:** Use the `x-razorpay-event-id` header as an idempotency key. Insert into `processed_webhook_events` with a unique constraint on `event_id`. If the row already exists, return 200 immediately. This is already modelled in the code pattern above.

**Warning signs:** Duplicate subscription activation emails, duplicate entries in payment history, usage counters off by one.

---

### Pitfall 5: `notes.user_id` Is the Only Reliable User-to-Subscription Binding

**What goes wrong:** Webhook receives a `subscription.charged` event but the handler cannot match the subscription to a Supabase user, causing the state update to be silently skipped.

**Why it happens:** Razorpay subscriptions do not natively carry your internal user ID. The `customer_id` (Razorpay's own) is available but requires a separate API call to fetch the associated email. The `notes` object is a key-value store that is preserved through the subscription lifecycle and included in all webhook payloads.

**How to avoid:** When creating the subscription, always set `notes: { user_id: user.id }`. In the webhook handler, read `payload.subscription.entity.notes.user_id`. Validate it is a valid UUID before using it in queries.

**Warning signs:** Subscription state not updating in Supabase after confirmed Razorpay payment.

---

## Schema Changes Required

The existing `subscriptions` table already has all required columns. One new table is needed:

```sql
-- Add to schema.sql (apply via Supabase SQL Editor)
-- Idempotency log for webhook events (PAY-05: D-11)
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,       -- x-razorpay-event-id header
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- No RLS needed — only written by service_role key in webhook handler
-- No user-facing reads needed
```

The `subscriptions` table already has `provider TEXT CHECK (provider IN ('stripe', 'razorpay'))`. The `'stripe'` option can remain (does not cause issues since it will never be written in Phase 3).

---

## Environment Variables

```bash
# .env.local additions for Phase 3
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx        # Public key — used in NEXT_PUBLIC_ too
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx     # Secret key — server-only
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxx  # Webhook secret — server-only
RAZORPAY_PLAN_ID=plan_xxxxxxxxxxxxxxx    # Pre-created plan ID — server-only

# Client-side (safe to expose — public key only)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
```

---

## Razorpay Subscription States Reference

| State | Meaning | Action in App |
|-------|---------|---------------|
| `created` | Subscription created, customer not authenticated yet | No access change |
| `authenticated` | Customer authenticated mandate (UPI/card saved) | Keep as-is; `subscription.activated` follows |
| `active` | Subscription is active and payments processing | Set `plan = 'pro'`, `status = 'active'` |
| `halted` | Payment failed after retries | Set `status = 'halted'`, keep `plan = 'pro'`, show payment update banner |
| `cancelled` | Subscription cancelled by merchant or customer | Set `plan = 'free'`, `status = 'cancelled'` |
| `completed` | All billing cycles exhausted (`total_count` reached) | Set `plan = 'free'`, `status = 'completed'` |
| `expired` | Was never authenticated within expiry window | No action needed (never became active) |

## Webhook Events Reference

| Event | When It Fires | Handler Action |
|-------|--------------|----------------|
| `subscription.activated` | `start_at` time passes | Optional: log. Do not grant Pro yet — wait for `subscription.charged` |
| `subscription.charged` | Successful payment processed | Set `plan = 'pro'`, `status = 'active'`, update `current_period_end` |
| `subscription.halted` | 4 consecutive failed payment retries | Set `status = 'halted'`, keep `plan = 'pro'` |
| `subscription.cancelled` | Cancelled via API or dashboard | Set `plan = 'free'`, `status = 'cancelled'` |
| `subscription.completed` | All billing cycles done | Set `plan = 'free'`, `status = 'completed'` |
| `subscription.pending_deactivated` | Cancellation scheduled at period end | Optional: show "cancels on [date]" in UI |

---

## Code Examples

### Loading Razorpay SDK Instance (Server-Only)

```typescript
// Source: razorpay npm package docs (v2.9.6)
// src/lib/razorpay/client.ts
import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

### Plan Creation (Run Once, Store plan_id in Env)

```typescript
// Source: razorpay-node SDK, subscriptions API
// Run this as a one-time script, NOT at runtime
const plan = await razorpay.plans.create({
  period: "monthly",
  interval: 1,
  item: {
    name: "SocialLens Pro",
    amount: 1999,          // $19.99 in cents (USD)
    currency: "USD",       // Requires international payments enabled on account
    description: "Unlimited AI social media analyses",
  },
});
console.log("Plan ID:", plan.id);  // Store as RAZORPAY_PLAN_ID
```

### Checkout Script in Client Components

```typescript
// Source: Next.js Script docs + Razorpay integration guides
// Pattern: include Script tag alongside the component that calls rzp.open()
import Script from "next/script";

// Option A: In layout.tsx (loads on every page — fine since it's small)
<Script
  id="razorpay-checkout"
  src="https://checkout.razorpay.com/v1/checkout.js"
/>

// Option B: Inline with the component (loads only when billing section rendered)
// Preferred for this app — billing UI is only in Settings and analyze page
```

### Cancellation via Razorpay API

```typescript
// Source: razorpay-node SDK subscriptions.cancel()
// Called from a server action or API route triggered by the cancel button
await razorpay.subscriptions.cancel(subscriptionId, {
  cancel_at_cycle_end: 1,  // 0 = cancel immediately, 1 = cancel at period end
});
// After cancel, webhook fires subscription.cancelled or subscription.pending_deactivated
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual script DOM injection (`useEffect` + createElement) | `next/script` component | Next.js 11+ | Idiomatic App Router approach |
| Client-side payment verification only | Server-side webhook as source of truth | Razorpay best practice always | Critical for security — no client trust |
| Single Supabase table for mixed provider state | Single table with `provider` column | Phase 1 already set up correctly | No change needed |

**Deprecated/outdated:**
- `@supabase/auth-helpers`: deprecated — project already uses `@supabase/ssr` (correct).
- Dual Stripe + Razorpay providers: superseded by D-01 decision — Razorpay only.

---

## Open Questions

1. **USD Plan Creation Permissions**
   - What we know: USD plans require account-level international payment enablement; error appears at plan creation time
   - What's unclear: Whether the specific merchant Razorpay account already has this enabled
   - Recommendation: Create plan manually in Razorpay dashboard as Wave 0 step; if USD fails, create plan in INR (1666 INR ≈ $19.99) and document the currency choice

2. **Razorpay Subscription `total_count` for "Unlimited"**
   - What we know: `total_count` must be a positive integer; subscriptions end when all cycles are billed
   - What's unclear: The exact maximum value; `120` (10 years) is used in examples
   - Recommendation: Use `total_count: 120` (10 years) as a practical unlimited equivalent; document for future renewal logic

3. **Grace Period for Halted Subscriptions**
   - What we know: When `subscription.halted` fires, the subscription enters halted state and no more automatic charges occur; customer must re-authenticate
   - What's unclear: Exact number of retry days before halting (documented as "after 4 failed retries" across 3 days)
   - Recommendation: On `subscription.halted`, keep `plan = 'pro'` and show a banner: "Your payment failed — update your payment method to keep Pro access." Do not downgrade until `subscription.cancelled` fires.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | razorpay SDK | Yes | v22.19.0 | — |
| npm | package install | Yes | included | — |
| Razorpay account | Plan creation, checkout | Requires manual setup | — | Cannot be automated |
| RAZORPAY_KEY_ID env | All checkout routes | Not yet in .env.local | — | Must be added before Wave 1 |
| RAZORPAY_KEY_SECRET env | Server-side SDK | Not yet in .env.local | — | Must be added before Wave 1 |
| RAZORPAY_WEBHOOK_SECRET env | Webhook handler | Not yet in .env.local | — | Must be added before Wave 1 |
| RAZORPAY_PLAN_ID env | Checkout route | Not yet in .env.local | — | Must be pre-created in dashboard |

**Missing dependencies with no fallback:**
- Razorpay merchant account with international payments enabled (for USD plans) — requires human action before Wave 0 runs
- All 4 Razorpay env vars — must be added to `.env.local` and Vercel environment settings

**Missing dependencies with fallback:**
- None — all code dependencies are available via npm

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | vitest.config.ts (exists, passWithNoTests: true) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | Razorpay subscription created server-side with plan_id | unit | `npm test -- tests/checkout.test.ts` | No — Wave 0 |
| PAY-02 | Checkout opens with subscription_id (not order_id) | manual (popup UI) | Manual browser test | — |
| PAY-03 | Free user blocked at 3 analyses; Pro user passes | unit | `npm test -- tests/analyze-gating.test.ts` | No — Wave 0 |
| PAY-04 | Usage count and plan displayed in Settings | manual (UI) | Manual browser test | — |
| PAY-05 | Webhook signature verification rejects invalid signatures | unit | `npm test -- tests/webhook.test.ts` | No — Wave 0 |
| PAY-05 | Duplicate webhook events deduplicated (idempotency) | unit | `npm test -- tests/webhook.test.ts` | No — Wave 0 |
| PAY-06 | Subscription state in Supabase updated after webhook | integration | `npm test -- tests/webhook.test.ts` | No — Wave 0 |

### Wave 0 Gaps

- `tests/checkout.test.ts` — covers PAY-01 (mock razorpay SDK, verify subscription_id returned)
- `tests/webhook.test.ts` — covers PAY-05, PAY-06 (mock Supabase, test signature verification, idempotency, state mapping per event type)
- `tests/analyze-gating.test.ts` — covers PAY-03 (mock subscriptions table returning pro plan, verify p_limit=999999 passed)

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| No Stripe at all (D-01) | PAY-01 and PAY-02 in REQUIREMENTS.md still reference Stripe — update both entries to Razorpay-only before planning |
| Immutability (never mutate objects) | Subscription update payloads must use new objects, not mutated ones |
| Functions < 50 lines | Webhook handler must be split: verify() + deduplicate() + processEvent() + recordProcessed() |
| Files < 800 lines | Webhook route and checkout route stay well under limit individually |
| No hardcoded secrets | All 4 Razorpay env vars must use `process.env.*`; validated at startup |
| `{ success, data, error }` envelope | Checkout API route must return `{ success: true, subscriptionId }` pattern |
| `interface` for object shapes | Define `RazorpayWebhookPayload`, `RazorpaySubscriptionEntity` interfaces in `src/lib/razorpay/types.ts` |
| No `any` — use `unknown` | Webhook body starts as `unknown`, narrowed via Zod schema |
| Server components for data fetching | Settings billing section: server component fetches plan + usage from Supabase, passes to client components |
| `getUser()` not `getSession()` | All auth checks in checkout and webhook routes must use `getUser()` |
| `SUPABASE_SERVICE_ROLE_KEY` server-only | Webhook handler uses service_role client — never in NEXT_PUBLIC_ var |
| `@/*` path aliases | All imports use `@/lib/razorpay/client` not relative paths |
| Error handling: never swallow | All razorpay SDK calls wrapped in try-catch with console.error logging |
| `"use client"` directive | UpgradePrompt, BillingSection, CancelDialog all need `"use client"` |

---

## Sources

### Primary (HIGH confidence)
- [razorpay npm package](https://www.npmjs.com/package/razorpay) — version 2.9.6 verified 2026-03-31
- [razorpay-node paymentVerification.md](https://github.com/razorpay/razorpay-node/blob/master/documents/paymentVerfication.md) — subscription signature format: `payment_id|subscription_id`
- [Razorpay Subscriptions Webhook Events](https://razorpay.com/docs/webhooks/subscriptions/) — event names and when they fire
- [Razorpay Webhook Validation](https://razorpay.com/docs/webhooks/validate-test/) — `x-razorpay-signature`, `x-razorpay-event-id`
- [PITFALLS.md](../.planning/research/PITFALLS.md) — Pitfall 5 (webhook idempotency), Pitfall 12 (Razorpay currency/international)
- Project `src/lib/supabase/schema.sql` — existing subscriptions + usage tables verified

### Secondary (MEDIUM confidence)
- [Razorpay Subscriptions States](https://razorpay.com/docs/payments/subscriptions/states/) — state list and transitions (page content not fully extractable; cross-verified via WebSearch findings)
- [Razorpay Webhook Best Practices](https://razorpay.com/docs/webhooks/best-practices/) — 5s timeout, at-least-once delivery, event-id deduplication
- [Integrate Razorpay with Next.js — akkhil.dev](https://www.akkhil.dev/blogs/razorpay-integration-with-nextjs) — subscription_id vs order_id pattern in checkout options
- [Integrate Razorpay Subscriptions — Abhishek Gupta Medium](https://abhishek-gupta.medium.com/integrate-razorpay-subscription-in-react-js-and-node-js-9109e33bae1a) — plan create + subscription create + checkout handler pattern

### Tertiary (LOW confidence — flag for validation)
- USD plan support requires "international payments" account permission — verified in GitHub issue #148 (razorpay-python) as account-level, not API-level; current status on specific merchant account unknown until tested
- `total_count: 120` as practical unlimited — community practice, not official Razorpay recommendation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — razorpay npm package version verified via `npm view`; SDK methods verified via razorpay-node GitHub docs
- Architecture patterns: HIGH — subscription_id vs order_id verified via multiple integration guides; webhook signature format verified via razorpay-node paymentVerfication.md
- Pitfalls: HIGH — halted state, raw body requirement, at-least-once delivery verified via official Razorpay docs + community post-mortems
- USD currency for plans: MEDIUM — resolution confirmed as account-level permission, but actual enablement on specific merchant account cannot be pre-verified

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Razorpay API is stable; checkout script URL and SDK methods unlikely to change)
