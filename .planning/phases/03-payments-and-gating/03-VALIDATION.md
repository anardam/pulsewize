---
phase: 3
slug: payments-and-gating
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed in Phase 1) |
| **Config file** | vitest.config.ts (exists) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Razorpay checkout popup opens | PAY-01 | Requires live Razorpay key + browser | Click upgrade, verify Razorpay modal opens |
| Subscription activated after payment | PAY-01 | Requires real payment | Complete test payment, verify subscription updates |
| Webhook processes payment events | PAY-05 | Requires Razorpay webhook delivery | Use Razorpay test mode, trigger webhook |
| Usage counter resets on subscription | PAY-03 | End-to-end flow | Subscribe, verify analyses become unlimited |
| Cancel subscription self-service | PAY-04 | Requires active subscription | Cancel from Settings, verify downgrade |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
