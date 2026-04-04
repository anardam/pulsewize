# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 01-foundation
**Areas discussed:** Auth UI flow, App navigation, User profile data, Data migration

---

## Auth UI Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated auth pages | /login and /signup as clean standalone pages | ✓ |
| Modal overlay | Auth modal pops up over the current page | |
| Inline in current page | Auth form replaces the username input area | |

**User's choice:** Dedicated auth pages
**Notes:** Standard SaaS pattern, easier to style

---

| Option | Description | Selected |
|--------|-------------|----------|
| Landing page first | Hero section, features list, CTA to signup | ✓ |
| Straight to login | Login is the first thing users see | |
| Allow analysis without login | Try one analysis free, then require signup | |

**User's choice:** Landing page first
**Notes:** Good for SEO and conversion

---

## App Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Top navbar | Horizontal nav bar with logo, page links, user avatar/menu | ✓ |
| Sidebar nav | Left sidebar with nav links, collapsible | |
| Minimal header only | Just logo + user menu | |

**User's choice:** Top navbar
**Notes:** Standard SaaS pattern

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard + Analyze + Settings | 3 main pages | |
| Analyze as home + Settings | Analysis page IS the home | |
| Full app: Dashboard + Analyze + Reports + Settings | 4 main pages | ✓ |

**User's choice:** Full app with 4 pages
**Notes:** Dashboard overview, new analysis, report history, and settings

---

## User Profile Data

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | Just email + password. Display name from email. | ✓ |
| Standard | Email + password + display name. Optional avatar. | |
| Extended | Email + password + display name + avatar + bio + social handles | |

**User's choice:** Minimal
**Notes:** Add more later if needed

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dark only | Single dark theme, less complexity | ✓ |
| Dark + Light toggle | User can switch themes | |
| System preference | Auto-detect OS dark/light setting | |

**User's choice:** Dark only
**Notes:** Keep current dark aesthetic

---

## Data Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Start fresh | New account = empty history. localStorage stays. | ✓ |
| Offer migration | Prompt to import localStorage reports on first login | |
| Auto-migrate | Silently move localStorage reports into account | |

**User's choice:** Start fresh
**Notes:** Simplest approach

---

| Option | Description | Selected |
|--------|-------------|----------|
| Server key only | All analysis uses server-side ANTHROPIC_API_KEY | ✓ |
| Keep BYOK option | Let users bring their own API key | |
| Both | Default to server key, optional BYOK for power users | |

**User's choice:** Server key only
**Notes:** Required for freemium usage tracking. Remove ApiKeyModal component.

---

## Claude's Discretion

- Supabase schema details (column types, indexes, RLS policy specifics)
- Middleware implementation pattern for auth protection
- Landing page layout and content specifics
- Next.js 15 migration specifics

## Deferred Ideas

None
