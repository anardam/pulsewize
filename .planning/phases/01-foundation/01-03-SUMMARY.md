---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [supabase, auth, middleware, oauth, next.js, ssr, cookies]

# Dependency graph
requires:
  - "01-01: Next.js 16.2.1 + @supabase/ssr installed"
  - "01-02: Supabase schema with profiles/reports tables"
provides:
  - "createSupabaseBrowser() — browser Supabase client factory"
  - "createSupabaseServer() — server Supabase client factory (async, cookie-based)"
  - "proxy.ts — Next.js 16 auth middleware with session refresh and route protection"
  - "GET /api/auth/callback — OAuth code exchange handler"
  - ".env.local.example — environment variable documentation"
affects: [04, 05, 06]

# Tech stack
tech_stack:
  added:
    - "@supabase/ssr@0.10.0 createBrowserClient, createServerClient"
    - "next/headers cookies() (await required for Next.js 15+)"
    - "vitest + @vitejs/plugin-react added to devDependencies"
  patterns:
    - "getUser() exclusively (never getSession()) for server-side auth validation"
    - "Cookie-based SSR session refresh via proxy.ts middleware"
    - "Protected route redirect pattern in middleware (not page-level guards)"

# Key files
key_files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - proxy.ts
    - src/app/api/auth/callback/route.ts
    - .env.local.example
    - src/__tests__/lib/supabase-clients.test.ts
  modified:
    - package.json

# Decisions
decisions:
  - "getUser() used exclusively in proxy.ts — never getSession() — because getUser() validates against Supabase auth server while getSession() only reads the cookie and can be spoofed"
  - "proxy.ts at project root (not middleware.ts) — Next.js 16 breaking change requires this rename; export named 'proxy' not 'middleware'"
  - "createSupabaseServer() is async and uses await cookies() — required for Next.js 15+ where cookies() returns a Promise"
  - "Authenticated users visiting /login or /signup are redirected to /dashboard — prevents auth page access when logged in"
  - "vitest and test devDependencies added to package.json devDependencies — they were installed by plan 01-00 but not tracked in package.json"

# Metrics
metrics:
  duration: "~10 minutes"
  completed: "2026-03-31"
  tasks_completed: 2
  files_changed: 7
---

# Phase 1 Plan 3: Auth Layer Summary

**One-liner:** Supabase cookie-based auth layer with getUser() server validation, Next.js 16 proxy.ts middleware, and Google OAuth callback route.

## What Was Built

### Task 1: Supabase Client Factories

**`src/lib/supabase/client.ts`** — Browser-side Supabase client factory using `createBrowserClient` from `@supabase/ssr`. Used in `"use client"` components for auth operations (sign in, sign up, sign out).

**`src/lib/supabase/server.ts`** — Server-side Supabase client factory using `createServerClient` with cookie store integration. Async because `cookies()` from `next/headers` returns a Promise in Next.js 15+. Used in Server Components, Route Handlers, and server actions.

**`src/__tests__/lib/supabase-clients.test.ts`** — Vitest tests verifying both factories return clients with an `auth` property. Uses `vi.mock` to mock `@supabase/ssr` and `next/headers`.

**`.env.local.example`** — Template documenting all required environment variables. No real credentials — placeholder values only.

### Task 2: proxy.ts Middleware and OAuth Callback

**`proxy.ts`** (project root) — Next.js 16 auth middleware. Intercepts every request, refreshes the Supabase session cookie, and enforces route protection:
- Protected routes (`/dashboard`, `/analyze`, `/reports`, `/settings`): redirects unauthenticated users to `/login`
- Auth routes (`/login`, `/signup`): redirects authenticated users to `/dashboard`
- Uses `supabase.auth.getUser()` exclusively (never `getSession()`)
- Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and `api/health`

**`src/app/api/auth/callback/route.ts`** — GET handler that exchanges the OAuth code returned by Google for a Supabase session. Redirects to `/dashboard` on success, `/login?error=oauth_failed` on failure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @supabase/ssr not installed despite being in package.json**
- **Found during:** Task 1 test run
- **Issue:** `@supabase/ssr` and `@supabase/supabase-js` were listed in `package.json` dependencies but not present in `node_modules`. A previous plan's `npm install` must have failed silently.
- **Fix:** Temporarily disabled the `@tesserix` private registry in `.npmrc` (registry is not reachable in current environment) and removed `@tesserix` entries from `package.json` to allow `npm install` to succeed. Then restored both after the install.
- **Files modified:** `.npmrc` (temporary disable/restore), `package.json` (temporary entry removal/restore)
- **Impact:** No code changes — pure infrastructure fix

**2. [Rule 2 - Missing critical functionality] vitest and test packages not in devDependencies**
- **Found during:** Task 1 test run (vitest not found in local node_modules)
- **Issue:** Vitest, `@vitejs/plugin-react`, `jsdom`, and testing library packages were installed by plan 01-00 but not tracked in `package.json` devDependencies. When `npm install` was run to add `@supabase/ssr`, npm removed these unlisted packages.
- **Fix:** Added all test infrastructure packages to `devDependencies` in `package.json` and reinstalled.
- **Files modified:** `package.json`
- **Commit:** 591676b

## Known Stubs

None — this plan creates foundational infrastructure. No UI rendering or data wiring involved.

## Self-Check: PASSED

- `src/lib/supabase/client.ts`: FOUND
- `src/lib/supabase/server.ts`: FOUND
- `proxy.ts`: FOUND
- `src/app/api/auth/callback/route.ts`: FOUND
- `.env.local.example`: FOUND
- `src/__tests__/lib/supabase-clients.test.ts`: FOUND
- `export function createSupabaseBrowser` in client.ts: VERIFIED
- `export async function createSupabaseServer` in server.ts: VERIFIED
- `getUser()` in proxy.ts: VERIFIED
- No `getSession()` calls in proxy.ts: VERIFIED
- `export const config` in proxy.ts: VERIFIED
- No `middleware.ts` at project root: VERIFIED
- `export async function GET` in callback route: VERIFIED
- `exchangeCodeForSession` in callback route: VERIFIED
- Task 1 commit 591676b: FOUND
- Task 2 commit 300c2dd: FOUND
- vitest tests pass: VERIFIED (2/2)
- npm run build exits 0: VERIFIED

---
*Phase: 01-foundation*
*Completed: 2026-03-31*
