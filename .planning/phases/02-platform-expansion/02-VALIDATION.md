---
phase: 2
slug: platform-expansion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed in Phase 1) |
| **Config file** | vitest.config.ts (exists from Phase 1) |
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

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PLAT-06 | unit | `npx vitest run src/__tests__/lib/scraper-types.test.ts` | W1 | pending |
| 02-02-01 | 02 | 2 | PLAT-01 | unit | `npx vitest run src/__tests__/lib/youtube-scraper.test.ts` | W2 | pending |
| 02-03-01 | 03 | 2 | PLAT-02,03,04,05 | unit | `npx vitest run src/__tests__/lib/scrapecreators.test.ts` | W2 | pending |
| 02-04-01 | 04 | 3 | PLAT-06 | unit | `npx vitest run src/__tests__/lib/scraper-registry.test.ts` | W3 | pending |
| 02-05-01 | 05 | 2 | PLAT-07 | unit | `npx vitest run src/__tests__/lib/platform-health.test.ts` | W2 | pending |
| 02-06-01 | 06 | 4 | PLAT-06 | build | `npm run build` | existing | pending |

---

## Wave 0 Requirements

*Existing infrastructure from Phase 1 covers all phase requirements. No Wave 0 needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| YouTube analysis end-to-end | PLAT-01 | Requires real YOUTUBE_API_KEY | Select YouTube, enter channel handle, verify report |
| Twitter/X analysis end-to-end | PLAT-02 | Requires real SCRAPECREATORS_API_KEY | Select Twitter, enter handle, verify report |
| Platform health badges render | PLAT-07 | Visual verification needed | Check /analyze page shows health status per platform |
| Instagram regression | existing | Runtime behavior check | Run an Instagram analysis, verify still works |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
