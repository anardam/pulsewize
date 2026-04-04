# Phase 3: Payments and Gating - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-31
**Phase:** 03-payments-and-gating
**Areas discussed:** Pricing tiers, Checkout flow, Payment UX, Settings billing UI

---

## Pricing Tiers

| Option | Description | Selected |
|--------|-------------|----------|
| Free + Pro | Two tiers only | ✓ |
| Free + Pro + Enterprise | Three tiers | |
| Free + Monthly + Annual | Two paid options | |

**User's choice:** Free + Pro (two tiers)

| Option | Description | Selected |
|--------|-------------|----------|
| $9/month | Competitive entry | |
| $19/month | Mid-range | |
| $29/month | Premium | |
| You decide | Claude picks | ✓ (initially) |

**Final decision:** $19.99/month — truly unlimited, no analysis cap. User asked about AI cost protection; chose higher price + unlimited over capped + cheaper.

**Pro features:** Multi-agent AI, competitor comparison, content calendar, growth tracking (all gated here, delivered in Phases 4-5)

---

## Checkout Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on analyze page | Upgrade prompt right where limit hit | ✓ |
| Modal overlay | Full-screen pricing modal | |
| Redirect to pricing page | Separate /pricing page | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe Checkout (hosted) | N/A — Stripe dropped | |
| Razorpay Standard Checkout | Popup modal, no redirect | ✓ |

---

## Payment UX

**Key decision:** Razorpay ONLY — no Stripe. Razorpay accepts payments globally (not India-only). Merchant needs Indian bank account for payouts. Simplifies to single payment provider.

---

## Settings Billing UI

All selected: current plan + usage, upgrade/downgrade, payment history, cancel subscription.

---

## Claude's Discretion

- Razorpay plan_id creation strategy
- Webhook signature verification
- Subscription lifecycle state machine
- Annual billing (deferred — monthly-only for v1)

## Deferred Ideas

None
