# Phase 1: Foundation - Research

**Researched:** 2026-03-31
**Domain:** Supabase Auth (SSR), PostgreSQL schema/RLS/RPC, Next.js 15/16 upgrade, scraper registry adapter pattern
**Confidence:** HIGH (core stack verified against official docs and npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Dedicated `/login` and `/signup` pages — clean standalone pages, not modals or inline forms
- **D-02:** Landing/marketing page at `/` for unauthenticated users — hero section, features list, pricing preview, CTA to signup
- **D-03:** After login, redirect to Dashboard (`/dashboard`) as the authenticated home
- **D-04:** Top navbar with logo, page links, and user avatar/dropdown menu — standard SaaS pattern
- **D-05:** Four main pages after auth: Dashboard (`/dashboard`), Analyze (`/analyze`), Reports (`/reports`), Settings (`/settings`)
- **D-06:** The current single-page state machine in `page.tsx` gets refactored into the `/analyze` route
- **D-07:** Minimal signup — just email + password or Google OAuth. Display name auto-derived from email. No avatar, bio, or social handles at signup.
- **D-08:** Dark theme only — keep current dark aesthetic, no light mode toggle
- **D-09:** Start fresh — new accounts begin with empty report history. localStorage reports are not migrated.
- **D-10:** Remove BYOK (bring your own API key) — all analysis uses server-side `ANTHROPIC_API_KEY`. Remove `ApiKeyModal` component and client-provided API key header logic.
- **D-11:** Supabase Postgres with RLS on all user-facing tables
- **D-12:** Core tables: `profiles` (user profile data), `reports` (saved analysis reports), `subscriptions` (payment/plan state), `usage` (monthly analysis counts)
- **D-13:** Atomic usage enforcement via Supabase RPC function `check_and_increment_usage()` — replaces in-memory `rate-limit.ts`
- **D-14:** Abstract existing Instagram scrapers behind a `PlatformScraper` interface/adapter pattern
- **D-15:** Registry maps platform names to scraper implementations — new platforms (Phase 2) slot in without changing the analyze route

### Claude's Discretion

- Supabase schema details (column types, indexes, RLS policy specifics)
- Middleware implementation pattern for auth protection
- Landing page layout and content specifics (follow modern SaaS conventions)
- Next.js 15 migration specifics (App Router changes, breaking changes handling)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Upgrade Next.js to latest version (15.x) and update all npm packages to latest | Next.js 16.2.1 is now latest; 15.x is no longer latest. Research confirms upgrade path and all breaking changes for 14 → 15 → 16. |
| INFRA-02 | Supabase project setup with PostgreSQL database schema for users, reports, subscriptions, and usage tracking | Schema design, RLS patterns, and column types documented below. |
| INFRA-03 | Replace in-memory rate limiter with atomic Supabase RPC-based usage enforcement | `check_and_increment_usage()` SQL pattern documented; atomic `UPDATE ... WHERE usage_count < limit RETURNING` verified. |
| INFRA-04 | Platform-agnostic scraper registry with adapter pattern (abstract existing Instagram scrapers) | `PlatformScraper` interface and registry map patterns documented; existing scrapers map cleanly to the interface. |
| AUTH-01 | User can sign up with email and password via Supabase Auth | `@supabase/supabase-js` v2.100.1 + `@supabase/ssr` v0.10.0 covers this. |
| AUTH-02 | User receives email verification after signup | Supabase Auth handles email verification out of the box; `signUp()` triggers verification email by default. |
| AUTH-03 | User can sign in with Google OAuth via Supabase Auth | Supabase OAuth provider config; Google OAuth credentials from Google Cloud Console required. |
| AUTH-04 | User session persists across browser refresh (cookie-based SSR via @supabase/ssr) | `@supabase/ssr` cookie-based session pattern with `proxy.ts` (Next.js 16) documented. |
| AUTH-05 | User can reset password via email link | Supabase `resetPasswordForEmail()` + update password via deep link; standard Supabase flow. |
| AUTH-06 | User can log out from any page | `supabase.auth.signOut()` from client component; redirect to `/` via `useRouter`. |
| AUTH-07 | Row Level Security (RLS) policies on all user-facing tables | All four tables require `ENABLE ROW LEVEL SECURITY` + policies referencing `auth.uid()`. Patterns documented below. |
</phase_requirements>

---

## Summary

Phase 1 adds Supabase authentication (email/password + Google OAuth), a PostgreSQL schema with RLS, atomic usage tracking via a Supabase RPC, a scraper registry abstraction over the existing Instagram scrapers, and a full route restructure replacing the single-page state machine with proper `/`, `/login`, `/signup`, `/dashboard`, `/analyze`, `/reports`, `/settings` pages. The design system is `@tesserix/web v1.7.0` with `@tesserix/tokens v1.0.0` (violet theme, dark-only).

**Critical version flag:** REQUIREMENTS.md says "upgrade to Next.js 15.x" but as of 2026-03-31 the latest stable is **Next.js 16.2.1**. Next.js 16 has a hard-breaking change: `middleware.ts` must be renamed to `proxy.ts` and the exported function renamed to `proxy`. Both 15 and 16 are valid upgrade targets — this research documents both paths so the planner can make the call. Recommendation: upgrade to **Next.js 15.5.14** (latest 15.x) to stay conservative and aligned with what REQUIREMENTS.md says; full 16.x migration can be a follow-up. Either is viable — the planner should confirm with the user.

**Critical package flag:** `@tesserix/web` and `@tesserix/tokens` do NOT exist on npm. The UI-SPEC.md references them extensively. This is an internal/private registry. The planner must either: (a) treat them as private packages requiring a custom npm registry or local path, or (b) note they are a fictional design system in the spec and substitute real packages (shadcn/ui + lucide-react + Tailwind). This is a **blocking unknown** — see Open Questions.

**Primary recommendation:** Install `@supabase/supabase-js@^2.100.1` + `@supabase/ssr@^0.10.0` + `zod@^4.3.6`. Write `proxy.ts` (not `middleware.ts` if upgrading to Next.js 16) or `middleware.ts` (if staying on 15.x). Build the `PlatformScraper` interface + registry before touching the analyze route. Atomic usage RPC must be created in Supabase before the analyze route is modified.

---

## Standard Stack

### Core (Upgrade)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.14 | Full-stack React framework | Latest 15.x as required; avoids 16.x breaking changes |
| react | 19.2.4 | UI library | Required by Next.js 15; latest stable |
| react-dom | 19.2.4 | DOM rendering | Paired with React 19 |
| @types/react | 19.2.14 | TypeScript types | Matches React 19 |
| @types/react-dom | 19.2.14 | TypeScript types | Matches React 19 |
| eslint-config-next | 15.5.14 | Linting | Must match Next.js version |

**DECISION POINT for planner:** If upgrading to Next.js 16.2.1 (latest), `middleware.ts` → `proxy.ts` rename is required. Supabase's `createServerClient` proxy pattern works the same way — just rename the file and the exported function. React 19.2.4 is required regardless; Next.js 15 also supports React 19.

### Authentication + Database

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.100.1 | Supabase client (browser + server) | Official client, latest stable |
| @supabase/ssr | 0.10.0 | Cookie-based SSR sessions for Next.js | Replaces deprecated `@supabase/auth-helpers-nextjs`; official recommendation |

### Validation

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Schema validation | Input validation at API boundaries; infer TypeScript types from schemas |

### UI (per UI-SPEC)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @tesserix/web | 1.7.0 | Component library | SPECIFIED IN UI-SPEC — existence on npm UNVERIFIED (see Open Questions) |
| @tesserix/tokens | 1.0.0 | Design tokens | SPECIFIED IN UI-SPEC — existence on npm UNVERIFIED (see Open Questions) |
| lucide-react | 1.7.0 | Icons | Specified in UI-SPEC; available on npm |

### Testing (New — zero coverage currently)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| vitest | 4.1.2 | Unit + integration tests | Faster than Jest, native TypeScript, Next.js compatible |
| @testing-library/react | 16.3.2 | Component tests | Standard React testing library |
| @playwright/test | 1.58.2 | E2E tests | Official Vercel/Next.js recommendation; covers auth flows |

### Alternatives Rejected

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | Deprecated, unmaintained as of 2024 |
| @supabase/ssr | NextAuth/Auth.js | Adds indirection; Supabase already owns DB + auth |
| Supabase RPC atomic increment | Client-side check + server increment | Race condition — not atomic |
| PlatformScraper adapter | Direct scraper calls in analyze route | Prevents Phase 2 expansion without rewriting the route |

**Installation (core phase packages):**

```bash
# Next.js 15.x upgrade (or use codemod: npx @next/codemod@canary upgrade 15)
npm install next@15.5.14 react@19.2.4 react-dom@19.2.4 eslint-config-next@15.5.14
npm install @types/react@19.2.14 @types/react-dom@19.2.14

# Auth + Database
npm install @supabase/supabase-js@^2.100.1 @supabase/ssr@^0.10.0

# Validation
npm install zod@^4.3.6

# UI (ONLY if @tesserix packages are available — see Open Questions)
npm install @tesserix/web@1.7.0 @tesserix/tokens@1.0.0 lucide-react@1.7.0

# Testing
npm install -D vitest@^4.1.2 @testing-library/react@^16.3.2 @playwright/test@^1.58.2
```

---

## Architecture Patterns

### Recommended Project Structure (post-phase-1)

```
src/
├── app/
│   ├── (auth)/                 # Route group — auth pages (no shared layout)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/            # Route group — authenticated pages (shared DashboardLayout)
│   │   ├── dashboard/page.tsx
│   │   ├── analyze/page.tsx    # Refactored from current page.tsx state machine
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── analyze/route.ts    # Updated: auth check, usage RPC, scraper registry
│   │   ├── auth/callback/route.ts  # OAuth callback handler (new)
│   │   ├── health/route.ts     # Keep (simplified)
│   │   └── insta-login/route.ts    # Keep or deprecate
│   ├── layout.tsx              # Root layout: TesserixProvider, dark class
│   └── page.tsx                # Landing page (replaces current state machine)
├── components/
│   ├── auth/                   # AuthForm, GoogleButton, etc.
│   ├── nav/                    # TopNav, UserMenu
│   ├── ReportDashboard.tsx     # Keep as-is (reused in /analyze and /reports)
│   ├── LoadingScreen.tsx       # Keep as-is
│   └── ManualEntryForm.tsx     # Keep as-is
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createBrowserClient (client components)
│   │   ├── server.ts           # createServerClient (server components, route handlers)
│   │   └── schema.sql          # DB schema with RLS policies
│   ├── scrapers/
│   │   ├── types.ts            # PlatformScraper interface, ScraperResult type
│   │   ├── registry.ts         # Platform → scraper mapping
│   │   └── instagram/          # Existing scrapers wrapped in adapter
│   │       ├── index.ts        # InstagramScraper: implements PlatformScraper
│   │       └── cascade.ts      # Existing fallback cascade logic
│   ├── claude-api.ts           # Remove BYOK path; server API key only
│   ├── rate-limit.ts           # DELETE — replaced by Supabase RPC
│   ├── types.ts                # Add ProfileUser, UsageRecord types
│   └── [existing libs]         # nlp.ts, trends.ts, prompt.ts — keep as-is
├── middleware.ts               # (Next.js 15) OR proxy.ts (Next.js 16) — Supabase auth
└── types/                      # Keep existing type declaration files
```

### Pattern 1: Supabase SSR Client Creation

**What:** Two separate client factory functions — browser and server. Never mix them.

**When to use:**
- `createBrowserClient` in `"use client"` components (auth forms, UserMenu)
- `createServerClient` in Server Components, Route Handlers, and proxy/middleware

**Example (server.ts):**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies(); // await required in Next.js 15+
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookies can't be set; middleware handles refresh
          }
        },
      },
    }
  );
}
```

**Example (client.ts):**
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Pattern 2: Proxy/Middleware for Auth Session Refresh

**What:** Intercepts every request to refresh the Supabase auth token and propagate updated cookies.

**File:** `middleware.ts` (Next.js 15) or `proxy.ts` (Next.js 16)

**When to use:** Required for cookie-based session persistence. Without this, Server Components will always see the user as unauthenticated after token expiry.

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// middleware.ts (Next.js 15) — rename exported fn to `proxy` and file to proxy.ts for Next.js 16
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ALWAYS use getUser() — never getSession() — for server-side auth checks
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/signup") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
```

### Pattern 3: Atomic Usage Check-and-Increment (Supabase RPC)

**What:** PostgreSQL function that atomically increments usage counter only if the monthly limit has not been reached.

**Why atomic:** Read-then-write in separate queries is a race condition. Two simultaneous requests both read `count=2`, both pass the `count < 3` check, and both increment to `3` — user gets 4 analyses for the price of 3. The atomic pattern prevents this.

**SQL (create in Supabase SQL Editor):**
```sql
-- Source: verified pattern from PITFALLS.md + Supabase docs
CREATE OR REPLACE FUNCTION check_and_increment_usage(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_month DATE := date_trunc('month', now())::DATE;
  v_result JSONB;
  v_updated_count INTEGER;
BEGIN
  -- Upsert usage record for this month, then attempt atomic increment
  INSERT INTO usage (user_id, billing_month, analyses_used)
  VALUES (p_user_id, v_current_month, 0)
  ON CONFLICT (user_id, billing_month) DO NOTHING;

  -- Atomic increment — only succeeds if under limit
  UPDATE usage
  SET analyses_used = analyses_used + 1
  WHERE user_id = p_user_id
    AND billing_month = v_current_month
    AND analyses_used < p_limit
  RETURNING analyses_used INTO v_updated_count;

  IF v_updated_count IS NULL THEN
    -- Limit reached — return current count without incrementing
    SELECT jsonb_build_object(
      'allowed', false,
      'analyses_used', analyses_used,
      'limit', p_limit
    ) INTO v_result
    FROM usage
    WHERE user_id = p_user_id AND billing_month = v_current_month;
  ELSE
    v_result := jsonb_build_object(
      'allowed', true,
      'analyses_used', v_updated_count,
      'limit', p_limit
    );
  END IF;

  RETURN v_result;
END;
$$;
```

**Call from Next.js route handler:**
```typescript
// Source: Supabase JS RPC docs
const { data, error } = await supabase.rpc("check_and_increment_usage", {
  p_user_id: user.id,
  p_limit: 3,
});

if (error) {
  return NextResponse.json({ success: false, error: "Usage check failed" }, { status: 500 });
}

if (!data.allowed) {
  return NextResponse.json(
    { success: false, error: "You've used all 3 free analyses this month. Upgrade to continue." },
    { status: 429 }
  );
}
```

### Pattern 4: PlatformScraper Interface + Registry

**What:** Adapter pattern that wraps existing Instagram scrapers behind a uniform interface. New platforms slot in without modifying the analyze route.

**When to use:** Any time a new platform is added in Phase 2.

```typescript
// src/lib/scrapers/types.ts
import type { InstagramProfile } from "@/lib/types";

export type NormalizedProfile = InstagramProfile; // Phase 2 will expand this union

export interface ScraperResult {
  success: boolean;
  profile?: NormalizedProfile;
  error?: string;
}

export interface PlatformScraper {
  readonly platform: string;
  scrape(username: string): Promise<ScraperResult>;
}

// src/lib/scrapers/registry.ts
import type { PlatformScraper } from "./types";
import { InstagramScraper } from "./instagram";

const registry = new Map<string, PlatformScraper>([
  ["instagram", new InstagramScraper()],
]);

export function getScraper(platform: string): PlatformScraper | undefined {
  return registry.get(platform.toLowerCase());
}

export function getSupportedPlatforms(): string[] {
  return Array.from(registry.keys());
}
```

### Pattern 5: Database Schema + RLS

**Complete schema:**
```sql
-- Source: D-11, D-12, D-13 from CONTEXT.md; RLS pattern from PITFALLS.md

-- Profiles: extends Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Reports: saved analysis results
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  username TEXT NOT NULL,
  report_data JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX reports_user_id_idx ON reports(user_id);
CREATE INDEX reports_analyzed_at_idx ON reports(analyzed_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions: plan/payment state
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  provider TEXT CHECK (provider IN ('stripe', 'razorpay')),
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- Subscriptions are only updated by server-side webhook handlers (service_role)
-- No UPDATE policy for users — prevents self-upgrading

-- Usage: monthly analysis counters
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  analyses_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, billing_month)
);

CREATE INDEX usage_user_month_idx ON usage(user_id, billing_month);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage" ON usage
  FOR SELECT USING (auth.uid() = user_id);
-- Usage is only modified by check_and_increment_usage() RPC (SECURITY DEFINER)
-- No UPDATE/INSERT/DELETE policy for users

-- Auto-create profile and subscription on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1)
  );
  INSERT INTO subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

### Pattern 6: OAuth Callback Route Handler

**What:** Exchanges the OAuth code from Google for a Supabase session. Required for Google sign-in to work in Next.js App Router.

```typescript
// src/app/api/auth/callback/route.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
```

### Anti-Patterns to Avoid

- **`getSession()` in server code:** Can be spoofed from cookies. Always use `getUser()` which validates with the Supabase Auth server.
- **`SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_` variables:** Bypasses all RLS. Only use `service_role` in server-only code.
- **RLS disabled:** Supabase tables have RLS OFF by default. Explicitly enable RLS on every user-facing table.
- **Separate check and increment:** Non-atomic. Use the `check_and_increment_usage()` RPC exclusively.
- **Direct scraper calls in analyze route:** Prevents future platform expansion. Always go through the registry.
- **`@supabase/auth-helpers-nextjs`:** Deprecated. Do not install. Use `@supabase/ssr` only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session cookie management | Custom JWT/cookie handling | `@supabase/ssr` createServerClient + middleware | HttpOnly cookies, rotation, and Supabase JWT validation handled automatically |
| Google OAuth flow | Custom OAuth redirect/token exchange | Supabase `signInWithOAuth({ provider: 'google' })` + `/api/auth/callback` | Handles PKCE, state validation, token storage |
| Email verification | Custom email/token system | Supabase Auth built-in | Supabase sends verification email on `signUp()` automatically |
| Password reset flow | Custom reset token + email | Supabase `resetPasswordForEmail()` | Built-in; generates secure one-time link |
| Usage rate limiting | In-memory Map | Supabase RPC `check_and_increment_usage()` | Atomic, survives restarts, shared across all serverless instances |
| Input validation | Manual type checks | `zod` schemas | Edge cases, nested validation, TypeScript type inference |
| Scraper fallback cascade | Inline if-else chain per platform | `PlatformScraper` registry + adapter | Registry decouples platforms; cascade logic belongs inside each adapter |

---

## Common Pitfalls

### Pitfall 1: `@tesserix/web` Not Available on npm

**What goes wrong:** `npm install @tesserix/web` fails because the package does not exist on the public npm registry.

**Why it happens:** The UI-SPEC.md specifies this package but it does not appear to be a public npm package. It may be: (a) an internal company package on a private registry, (b) a fictional/planned package name in the spec, or (c) a workspace package in a monorepo not yet created.

**How to avoid:** Before implementing any UI work, confirm whether `@tesserix/web` is installable. If not, substitute with `shadcn/ui` (which is what Tesserix is modeled after based on the component list) + `lucide-react`. The component mapping is 1:1: Tesserix `Button` = shadcn `Button`, Tesserix `AuthLayout` = custom wrapper, etc. The UI-SPEC color tokens and spacing scale can be implemented directly in `globals.css` and Tailwind config.

**Warning signs:** `npm install @tesserix/web` exits with 404.

### Pitfall 2: Supabase `service_role` Key in Client Code (CVE-2025-48757)

**What goes wrong:** Service role key exposed in browser bundle or `NEXT_PUBLIC_*` env variable bypasses all RLS — any user can read all data.

**How to avoid:** `SUPABASE_SERVICE_ROLE_KEY` must never appear in any `NEXT_PUBLIC_` variable or client-side code. Only use in server-side route handlers via `process.env.SUPABASE_SERVICE_ROLE_KEY`. Verify with a grep before each commit.

**Warning signs:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in any file.

### Pitfall 3: Async Request APIs in Next.js 15+

**What goes wrong:** `cookies()`, `headers()`, `params`, and `searchParams` are now async in Next.js 15. Calling them synchronously will produce TypeScript errors and runtime warnings.

**How to avoid:** Always `await cookies()` and `await headers()` in server components and route handlers. Run the codemod: `npx @next/codemod@canary upgrade 15` which automates this.

**Warning signs:** TypeScript error `Type 'ReadonlyRequestCookies' is not assignable to type 'Promise<...>'`.

### Pitfall 4: Race Condition on Usage Counter

**What goes wrong:** Two concurrent analyze requests both pass the usage check before either increments — user gets extra free analyses.

**How to avoid:** Use `check_and_increment_usage()` RPC exclusively. Never read usage count, check it, then increment in separate operations.

**Warning signs:** Any code that calls `SELECT analyses_used FROM usage WHERE ...` followed by a separate `UPDATE usage SET analyses_used = analyses_used + 1`.

### Pitfall 5: Next.js 16 `middleware.ts` → `proxy.ts` Breaking Change

**What goes wrong:** If upgrading to Next.js 16.2.1 (latest), `middleware.ts` is deprecated. The build continues to work with warnings in 16.x but the export name must be `proxy`, not `middleware`. In future releases, `middleware.ts` may be fully removed.

**How to avoid:** If targeting Next.js 15, keep `middleware.ts`. If targeting Next.js 16, rename to `proxy.ts` and rename the exported function to `proxy`. The codemod handles this automatically.

**Warning signs:** `deprecated middleware.ts` build warning in Next.js 16.

### Pitfall 6: `getSession()` vs `getUser()` in Server Components

**What goes wrong:** `supabase.auth.getSession()` reads from the cookie without validating with the Supabase auth server. A tampered cookie can fake an authenticated session. Using `getSession()` in middleware/proxy for auth protection creates a security hole.

**How to avoid:** Always use `supabase.auth.getUser()` in `middleware.ts`/`proxy.ts` and server-side authorization checks. `getUser()` makes a network call to validate the token with Supabase servers.

**Warning signs:** `supabase.auth.getSession()` in `middleware.ts`, `proxy.ts`, or any Server Component used for access control.

### Pitfall 7: Missing RLS `ENABLE ROW LEVEL SECURITY` on New Tables

**What goes wrong:** Tables are created and data is inserted, but RLS is not enabled. All users can query any row via the Supabase `anon` key.

**How to avoid:** `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;` must immediately follow every `CREATE TABLE` statement. Also add a `CREATE POLICY` for each access pattern. Tables with no policies and RLS enabled are inaccessible even to the table owner — add policies before testing.

**Warning signs:** Supabase dashboard shows tables with RLS "off" indicator.

### Pitfall 8: OAuth Redirect URL Not Configured in Supabase Dashboard

**What goes wrong:** Google OAuth redirect returns to `localhost:3000/api/auth/callback` in production, causing `invalid redirect URL` error.

**How to avoid:** In Supabase Dashboard → Authentication → URL Configuration, add both `http://localhost:3000/api/auth/callback` (dev) and `https://[production-domain]/api/auth/callback` (prod) to the allowed redirect URLs.

**Warning signs:** `OAuth error: redirect_uri_mismatch` in browser console after Google sign-in.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Auth helpers deprecated; `@supabase/ssr` is the official package |
| Synchronous `cookies()` | `await cookies()` | Next.js 15 | All request-time APIs are now async |
| `middleware.ts` + `export function middleware` | `proxy.ts` + `export function proxy` | Next.js 16 | Network boundary clarified; middleware deprecated in 16 |
| `supabase.auth.getSession()` | `supabase.auth.getUser()` | 2024 (Supabase) | `getUser()` validates token server-side; `getSession()` reads stale cookie |
| In-memory rate limiter (`Map`) | Supabase RPC atomic increment | Phase 1 | Stateless serverless environment requires DB-backed atomic counters |
| `fetch` cached by default | `fetch` NOT cached by default | Next.js 15 | Add `cache: 'force-cache'` explicitly where caching is desired |
| `next lint` command | `eslint` CLI directly | Next.js 16 | `next lint` removed in Next.js 16; update `package.json` scripts |

**Deprecated/outdated in this project:**
- `src/lib/rate-limit.ts`: Delete entirely. Replaced by `check_and_increment_usage()` RPC.
- `src/components/ApiKeyModal.tsx`: Delete (D-10). Remove BYOK path from `analyze/route.ts`.
- `src/lib/report-history.ts`: Superseded by Supabase `reports` table in Phase 5; can keep temporarily for backward compat but do not rely on it.
- `localStorage` for `anthropic_api_key`: Remove from all client code (D-10).
- `src/app/api/health/route.ts` API key check logic: Simplify — no longer need to check for client API key.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + runtime | Yes | v22.19.0 | — |
| npm | Package manager | Yes | 10.9.3 | — |
| Supabase project | AUTH-01..07, INFRA-02, INFRA-03 | Unknown — needs setup | — | Create at supabase.com |
| Google OAuth credentials | AUTH-03 | Unknown — needs GCP setup | — | Skip Google OAuth, email/password only |
| @tesserix/web npm package | UI-SPEC components | NOT FOUND on npm | — | shadcn/ui substitution (see Open Questions) |

**Missing dependencies with no fallback:**
- Supabase project: Must be created at supabase.com before any auth/DB work can be tested. Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Google OAuth app: Must be configured in Google Cloud Console and enabled in Supabase Dashboard before AUTH-03 can be tested.

**Missing dependencies with fallback:**
- `@tesserix/web`: If unavailable, substitute shadcn/ui + raw Tailwind (see Open Questions — this is a blocking question for the UI work).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 + @testing-library/react 16.3.2 + @playwright/test 1.58.2 |
| Config file | `vitest.config.ts` — does not exist yet (Wave 0 gap) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `next build` succeeds after upgrade | smoke | `npm run build` | N/A (build command) |
| INFRA-02 | Schema tables exist with RLS enabled | manual | Supabase Dashboard inspection | N/A |
| INFRA-03 | `check_and_increment_usage()` rejects at limit; concurrent calls don't over-count | unit | `npx vitest run tests/rpc.test.ts` | Wave 0 gap |
| INFRA-04 | `getScraper('instagram')` returns scraper; `scrape()` returns `ScraperResult` | unit | `npx vitest run tests/scrapers/registry.test.ts` | Wave 0 gap |
| AUTH-01 | Email/password signup creates user + profile row | integration | `npx playwright test tests/auth/signup.spec.ts` | Wave 0 gap |
| AUTH-02 | Signup triggers verification email (Supabase logs) | manual | Supabase Dashboard email logs | N/A |
| AUTH-03 | Google OAuth redirects to `/dashboard` | manual/e2e | `npx playwright test tests/auth/google-oauth.spec.ts` | Wave 0 gap |
| AUTH-04 | Hard refresh on `/dashboard` keeps session | e2e | `npx playwright test tests/auth/session-persist.spec.ts` | Wave 0 gap |
| AUTH-05 | Reset password email is sent | manual | Supabase Dashboard email logs | N/A |
| AUTH-06 | Sign out redirects to `/` + clears cookies | e2e | `npx playwright test tests/auth/signout.spec.ts` | Wave 0 gap |
| AUTH-07 | Unauthenticated query to `reports` table returns no rows | integration | `npx vitest run tests/rls.test.ts` | Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npm run build` (catches TypeScript errors; fast)
- **Per wave merge:** `npx vitest run` (unit + integration tests)
- **Phase gate:** Full suite (`npx vitest run && npx playwright test`) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — vitest configuration for Next.js App Router
- [ ] `playwright.config.ts` — base URL, test dir, auth state file
- [ ] `tests/auth/signup.spec.ts` — covers AUTH-01
- [ ] `tests/auth/google-oauth.spec.ts` — covers AUTH-03
- [ ] `tests/auth/session-persist.spec.ts` — covers AUTH-04
- [ ] `tests/auth/signout.spec.ts` — covers AUTH-06
- [ ] `tests/rls.test.ts` — covers AUTH-07
- [ ] `tests/rpc.test.ts` — covers INFRA-03
- [ ] `tests/scrapers/registry.test.ts` — covers INFRA-04

---

## Open Questions

1. **`@tesserix/web` package availability — BLOCKING for UI work**
   - What we know: `npm view @tesserix/web version` returns `NOT_FOUND`. The UI-SPEC.md references it as the component library for all pages.
   - What's unclear: Whether this is a private npm package (requires registry auth), a local workspace package to be created, or a fictional stand-in.
   - Recommendation: Before planning UI tasks, confirm with user. If unavailable on npm, substitute shadcn/ui — the component list in the UI-SPEC (`Button`, `Input`, `Form`, `Card`, `AuthLayout`, `TopNav`, etc.) maps 1:1 with shadcn/ui components. Install: `npx shadcn@latest init` + `npx shadcn@latest add button input card badge avatar dropdown-menu tabs separator toast skeleton`.

2. **Next.js 15 vs 16 upgrade target**
   - What we know: REQUIREMENTS.md says "15.x" but was written when 15 was latest. Current latest is 16.2.1. Next.js 16 has one major additional breaking change: `middleware.ts` → `proxy.ts`.
   - What's unclear: Whether user wants strictly 15.x as stated or latest (16.x).
   - Recommendation: Upgrade to **Next.js 15.5.14** (latest 15.x) to honor the stated requirement. The codemod handles all 14→15 breaking changes automatically. Document the 15→16 path as a follow-up if desired.

3. **Supabase project status**
   - What we know: No Supabase credentials exist in the project env files.
   - What's unclear: Whether a Supabase project has already been created externally by the user.
   - Recommendation: First task in Wave 1 should be: "Confirm or create Supabase project; add URL and keys to `.env.local`."

4. **`report_data` storage strategy**
   - What we know: PITFALLS.md warns that `jsonb` report storage can exhaust Supabase free tier DB (500 MB) quickly if reports are large JSON blobs.
   - What's unclear: Average size of `AnalysisReport` JSON (14 top-level fields, nested objects).
   - Recommendation: Store `report_data` as `jsonb` in Phase 1 (simpler), but add a `TEXT CHECK (octet_length(report_data::text) < 65536)` constraint (64 KB max) as a safeguard. Phase 5 can migrate to Supabase Storage if report sizes grow.

---

## Project Constraints (from CLAUDE.md)

The following directives from `./CLAUDE.md` (project-level) and global `~/.claude/CLAUDE.md` apply:

**From project CLAUDE.md:**
- All application code must be TypeScript (`src/**/*.ts`, `src/**/*.tsx`)
- Use `@/*` path alias for all internal imports — never relative paths like `../../lib/types`
- PascalCase for components, kebab-case for lib files
- API response shape: `{ success: boolean; data?: T; error?: string }`
- Functions: explicit return types on exported async functions
- `interface` for object shapes, `type` for unions
- No `React.FC` usage
- Error handling: never silently swallow errors
- Dark theme only: `class="dark"` on `<html>` — no toggle

**From global ~/.claude/CLAUDE.md:**
- Git: no signatures on commits; single-line commit messages
- Immutability: always return new objects, never mutate in place
- File size: 200-400 lines typical, 800 max — split large files
- Security: `SUPABASE_SERVICE_ROLE_KEY` must never appear in `NEXT_PUBLIC_*` variables
- No hardcoded secrets — use environment variables

**Planner MUST verify:**
- `SUPABASE_SERVICE_ROLE_KEY` is only in server-side code, never in `NEXT_PUBLIC_*` vars
- All new tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + explicit policies
- `getUser()` is used (not `getSession()`) in `middleware.ts`/`proxy.ts`
- `check_and_increment_usage()` RPC is used instead of any read-check-increment pattern

---

## Sources

### Primary (HIGH confidence)
- [Supabase SSR — Next.js official guide](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware pattern, createServerClient, getUser()
- [Next.js 15 upgrade guide (official)](https://nextjs.org/docs/app/guides/upgrading/version-15) — async APIs, caching changes, breaking changes
- [Next.js 16 upgrade guide (official)](https://nextjs.org/docs/app/guides/upgrading/version-16) — middleware → proxy rename, Turbopack default, React 19.2
- npm registry — verified versions: `next@15.5.14`, `@supabase/supabase-js@2.100.1`, `@supabase/ssr@0.10.0`, `zod@4.3.6`, `react@19.2.4`, `vitest@4.1.2`, `@playwright/test@1.58.2`, `lucide-react@1.7.0`
- `.planning/research/PITFALLS.md` — critical pitfalls 1-9 (race condition, RLS bypass, OAuth session flicker)
- `.planning/research/STACK.md` — recommended stack from prior research
- `.planning/phases/01-foundation/01-UI-SPEC.md` — design system, component list, page contracts

### Secondary (MEDIUM confidence)
- [Supabase RPC increment pattern — haffi.dev](https://haffi.dev/blogs/4-supabase-function/) — confirmed atomic UPDATE...WHERE pattern
- [Next.js 16 release announcement](https://nextjs.org/blog/next-16) — middleware deprecation confirmed
- npm registry check for `@tesserix/web` — confirmed NOT_FOUND

### Tertiary (LOW confidence — needs validation)
- `check_and_increment_usage()` SQL function: pattern is verified but exact function signature should be tested against a real Supabase instance before planning tasks assume it works as written

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry; official docs consulted
- Architecture patterns: HIGH — Supabase SSR pattern from official docs; scraper adapter is standard GoF pattern
- Database schema: MEDIUM-HIGH — standard PostgreSQL/Supabase patterns; exact column types at discretion
- Pitfalls: HIGH — sourced from PITFALLS.md which cites official docs and CVE records
- @tesserix/web: LOW — package not found on npm; status unknown

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Supabase/Next.js APIs stable; scraping APIs more volatile but not relevant to Phase 1)
