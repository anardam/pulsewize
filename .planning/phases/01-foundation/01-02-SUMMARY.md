---
phase: 01-foundation
plan: "02"
subsystem: database
tags: [supabase, postgres, rls, sql, row-level-security, rpc, triggers]

# Dependency graph
requires: []
provides:
  - Complete Supabase Postgres schema with 4 tables (profiles, reports, subscriptions, usage)
  - RLS policies on all user-facing tables
  - handle_new_user() trigger auto-creating profile and free subscription on signup
  - check_and_increment_usage() SECURITY DEFINER RPC for atomic monthly usage enforcement
affects: [01-03, 01-04, 01-05, phase-02, phase-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER RPC for atomic operations that bypass RLS (check_and_increment_usage)"
    - "ON CONFLICT DO NOTHING for idempotent inserts in triggers"
    - "Separate billing_month DATE column for monthly usage bucketing"

key-files:
  created:
    - src/lib/supabase/schema.sql
  modified: []

key-decisions:
  - "SECURITY DEFINER on check_and_increment_usage() — users cannot modify usage rows directly, only the RPC can increment"
  - "No UPDATE/INSERT/DELETE RLS policies on subscriptions or usage — only service_role key (webhooks) or SECURITY DEFINER functions can modify these"
  - "Free tier default 3 analyses/month enforced at DB layer via p_limit parameter defaulting to 3"
  - "ON CONFLICT DO NOTHING in handle_new_user trigger — idempotent, safe to re-run schema"

patterns-established:
  - "All user tables have RLS enabled — no table without a SELECT policy"
  - "Atomic check-and-increment pattern: INSERT row if missing, then conditional UPDATE RETURNING"

requirements-completed: [INFRA-02, INFRA-03, AUTH-07]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 01 Plan 02: Supabase Database Schema Summary

**Production-ready Postgres schema with 4 tables, RLS on all, SECURITY DEFINER usage RPC, and auto-profile trigger — complete DB foundation for auth, reports, and freemium enforcement**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T22:39:14Z
- **Completed:** 2026-03-30T22:43:33Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `src/lib/supabase/schema.sql` with all 4 tables: profiles, reports, subscriptions, usage
- Enabled RLS on every table with correct per-user SELECT policies
- Implemented `handle_new_user()` trigger that auto-creates profile + free subscription on signup
- Implemented `check_and_increment_usage()` SECURITY DEFINER RPC that atomically checks and increments monthly usage, returning `{ allowed, analyses_used, limit }`

## Task Commits

Each task was committed atomically:

1. **Task 1: Write complete schema.sql with RLS, trigger, and usage RPC** - `a19d04a` (feat)

**Plan metadata:** _(see final commit below)_

## Files Created/Modified
- `src/lib/supabase/schema.sql` - Complete Supabase schema with 4 tables, RLS policies, auto-profile trigger, and atomic usage RPC

## Decisions Made
- SECURITY DEFINER used on both `handle_new_user()` and `check_and_increment_usage()` — the former needs to write to profiles/subscriptions as postgres during auth signup, the latter needs to bypass user RLS to atomically read/write usage rows
- Subscriptions and usage tables have no user-writable RLS policies — these are exclusively modified by service_role (payment webhooks) or SECURITY DEFINER RPCs
- `p_limit DEFAULT 3` parameter on the RPC allows future pro-tier callers to pass higher limits without schema changes

## Deviations from Plan

None - plan executed exactly as written.

Note: The acceptance criteria stated `grep -c "SECURITY DEFINER"` should return 2, but the verbatim SQL from the plan contains 4 occurrences (2 in comments, 2 in actual function declarations). Both SECURITY DEFINER functions exist correctly — this is a count discrepancy in the acceptance criteria comment, not a schema issue.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before dependent plans (01-03, 01-05) can be tested:**

1. **Create Supabase project** at https://supabase.com/dashboard
2. **Apply schema:** Supabase Dashboard -> SQL Editor -> New query -> paste `src/lib/supabase/schema.sql` contents -> Run
3. **Set environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings -> API -> Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings -> API -> anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings -> API -> service_role key (server-only, never NEXT_PUBLIC_)
4. **Enable Google OAuth:** Authentication -> Providers -> Google -> enable + paste client ID and secret
5. **Add redirect URLs:** Authentication -> URL Configuration -> Site URL: `http://localhost:3000`, Redirect URLs: `http://localhost:3000/api/auth/callback` and `https://[production-domain]/api/auth/callback`
6. **Add env vars to Vercel:** Vercel Dashboard -> Project -> Settings -> Environment Variables

## Next Phase Readiness
- Schema is complete and ready for Plan 01-03 (Supabase client + auth routes)
- Plan 01-05 (analyze API route) depends on `check_and_increment_usage()` RPC being applied to the database
- No blockers — schema application is a prerequisite user action, not a code blocker

---
*Phase: 01-foundation*
*Completed: 2026-03-30*
