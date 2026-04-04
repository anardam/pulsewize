---
phase: 05-growth-tracking-and-dashboard
plan: "03"
subsystem: profile-api
tags: [supabase, api-route, tdd, authentication, profile-update]
dependency_graph:
  requires:
    - createSupabaseServer() from src/lib/supabase/server.ts (Phase 01)
    - profiles table with display_name and avatar_url columns (Phase 01 + 05-01 schema migration)
  provides:
    - PATCH /api/profile endpoint
    - Profile update with display_name (trimmed, max 64 chars) and avatar_url
    - Authenticated profile update with 401 on missing auth
  affects:
    - src/app/api/profile/route.ts (created)
    - src/__tests__/api/profile.test.ts (upgraded from todos to real tests)
tech_stack:
  added: []
  patterns:
    - TDD (RED -> GREEN cycle)
    - Next.js App Router API Route Handler
    - Supabase server client with cookie-based auth
    - Partial update pattern (only fields provided in body are updated)
    - Immutable updates object (built fresh per request, no mutation)
key_files:
  created:
    - src/app/api/profile/route.ts
  modified:
    - src/__tests__/api/profile.test.ts
decisions:
  - display_name trimmed and sliced to 64 chars before write — prevents DB field overflow and whitespace pollution
  - updates object always includes updated_at — ensures timestamp is refreshed even on empty body
  - Route never calls auth.updateUser() — profile data only, Supabase Auth identity is not modified
  - Partial update: only explicitly provided fields (display_name, avatar_url) are added to updates — unknown fields silently ignored for security
metrics:
  duration: 5
  completed_date: "2026-03-31"
  tasks_completed: 1
  files_changed: 2
---

# Phase 5 Plan 03: PATCH /api/profile Summary

**One-liner:** PATCH /api/profile with cookie-based auth gating, display_name truncation to 64 chars, and partial update pattern via Supabase profiles table.

## What Was Built

Created `src/app/api/profile/route.ts` — the server-side endpoint for updating user profile fields (display_name and avatar_url) from the settings page ProfileEditSection component (built in Plan 07).

Key behaviors:
- Unauthenticated requests return 401 with `{ success: false, error: "Unauthorized" }`
- Only `display_name` and `avatar_url` fields from the request body are accepted; unknown fields are silently ignored
- `display_name` is always trimmed of whitespace and truncated to 64 characters before writing
- `avatar_url` is stored as-is (client-side upload to Supabase Storage is handled separately)
- Always sets `updated_at` to current ISO timestamp on every update
- Supabase errors are returned as 500 with `{ success: false, error: message }`
- Successful updates return 200 with `{ success: true }`

## Deviations from Plan

### TDD Test Upgrade

**[Rule 2 - Missing Critical Functionality] Upgraded it.todo stubs to real test implementations**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** The existing `profile.test.ts` from Plan 05-01 contained only `it.todo` stubs that would never catch regressions. The plan called for tests to go RED then GREEN, but todos don't fail — they pass silently.
- **Fix:** Replaced all 5 todo stubs with 6 real test cases covering: 401 on missing auth, display_name update, display_name truncation to 64 chars, avatar_url update, unknown field filtering, and 500 on Supabase error.
- **Files modified:** `src/__tests__/api/profile.test.ts`
- **Commit:** ab34440 (RED tests), 28a189e (GREEN implementation)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement PATCH /api/profile | 28a189e | src/app/api/profile/route.ts, src/__tests__/api/profile.test.ts |

## Verification Results

- `npx vitest run src/__tests__/api/profile.test.ts` — 6 tests passed (0 failed)
- `grep "auth.updateUser" src/app/api/profile/route.ts` — no matches (correct)
- `.from("profiles").update()` pattern present in route.ts (multi-line, lines 36-37)

## Known Stubs

None — all behaviors are fully implemented.

## Self-Check: PASSED

- [x] `src/app/api/profile/route.ts` exists
- [x] `src/__tests__/api/profile.test.ts` contains 6 real tests
- [x] Commit 28a189e exists
- [x] All 6 tests pass GREEN
