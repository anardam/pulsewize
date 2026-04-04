# Phase 5: Growth Tracking and Dashboard - Research

**Researched:** 2026-03-31
**Domain:** Recharts, Supabase queries/storage, Next.js 14 App Router pagination and profile updates
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full analytics dashboard — detailed stats cards, chart previews, activity feed, saved profiles list
- **D-02:** Stats cards: total analyses, platforms analyzed, Pro status, this month's usage
- **D-03:** Chart preview: follower/engagement trends for most-analyzed profile
- **D-04:** Recent activity feed: last 10 analyses with platform icon, handle, date
- **D-05:** Quick "Analyze" CTA button prominent on dashboard
- **D-06:** Use Recharts library — React-native, Tailwind-friendly, SSR compatible
- **D-07:** Chart metrics: follower count, engagement rate, posting frequency over time
- **D-08:** Charts show data from saved reports for a specific handle — each analysis snapshot becomes a data point
- **D-09:** Card grid layout — each card shows handle, platform icon, date, profile score, report type
- **D-10:** Filters: platform dropdown, date range picker, search by handle
- **D-11:** Pagination or infinite scroll for large report histories
- **D-12:** Add profile editing — display name and avatar upload
- **D-13:** Keep existing: account info, billing section, danger zone (from Phases 1+3)
- **D-14:** Add "compare from saved reports" option to CompetitorComparison component — user can select 2-3 saved reports to compare instead of entering new handles

### Claude's Discretion
- Recharts chart type selection (Line, Area, Bar for different metrics)
- Avatar upload storage (Supabase Storage vs base64 in profile)
- Pagination vs infinite scroll for reports page
- Activity feed data structure

### Deferred Ideas (OUT OF SCOPE)
- None — this is the final phase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GROW-01 | User can save analysis reports to their account (persisted in Supabase) | Reports table already writes on every analysis (Phase 4); API layer and UI to surface this data |
| GROW-02 | User can view historical reports for any previously analyzed profile | Supabase `.eq("username")` filter + range pagination on reports table |
| GROW-03 | Dashboard shows metric trends over time (followers, engagement rate, posting frequency) | Recharts AreaChart/LineChart on time-bucketed report_data JSONB fields |
| GROW-04 | Visual charts for growth metrics across saved reports | Recharts with ResponsiveContainer, "use client" components, dark theme via inline stroke/fill props |
| DASH-01 | User dashboard as authenticated home page with saved reports and account overview | Full rewrite of dashboard/page.tsx with Supabase server data fetch |
| DASH-02 | Account settings page (profile, email, password, subscription management) | Extend settings/page.tsx with display name + avatar; use supabase.from("profiles").update() + Storage for avatar |
| DASH-03 | Report history with search and filter by platform and date | Full rewrite of reports/page.tsx; new /api/reports route with platform/date/search filters + range() pagination |
</phase_requirements>

---

## Summary

Phase 5 builds the persistent user home: dashboard, report history, growth charts, and profile editing. All data already exists in the Supabase `reports` table written by Phase 4. The work is purely surface-level: querying, aggregating, and displaying that data.

The primary integration concern is **Recharts**, which is not yet installed. Recharts 3.8.1 is the latest stable version (released March 2026) and requires a `react-is` peer dependency alongside the main package. All Recharts components must live in `"use client"` components — they use DOM APIs for sizing and will cause hydration mismatches if rendered on the server without dynamic import guards.

The **avatar upload** decision (Claude's discretion) should use **Supabase Storage** — base64 in the `profiles` table would bloat the database and degrade query performance. The `profiles` table needs a new `avatar_url TEXT` column. Profile display name updates go directly via `supabase.from("profiles").update()` (not `auth.updateUser()`) since `display_name` is stored in the `profiles` table, not in `auth.users` metadata.

A critical **missing dependency** was discovered: `@supabase/ssr` is imported throughout the codebase (`src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`) but is absent from `package.json` and `node_modules`. The Wave 0 plan must add it (`npm install @supabase/ssr`). Additionally, the `report_type` column added in Phase 4 is present in the live analyze route but missing from the main `schema.sql` — a migration note should be included.

**Primary recommendation:** Install recharts + @supabase/ssr first (Wave 0), then build dashboard → reports page → charts → profile edit → competitor compare extension.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | React chart components (Line, Area, Bar, Pie) | Decision D-06; React-native, no Canvas, Tailwind-compatible |
| react-is | 19.2.4 (already installed) | Peer dep required by recharts 3.x | recharts 3.x install fails without it |
| @supabase/ssr | 0.10.0 | Supabase server + browser clients with cookie-based auth | Already used in codebase but absent from package.json — must be added |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | already installed | Platform icons, filter icons in report cards | Report card platform badges, filter UI |
| date-fns | 4.1.0 (already installed) | Date formatting for chart x-axis labels and date range UI | Format `analyzed_at` timestamps for display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts (locked, D-06) | Chart.js, Victory, Nivo | Recharts is locked; lighter than Nivo for this use case |
| Supabase Storage for avatar | Base64 in profiles table | Storage is correct — base64 bloats DB, degrades SELECT performance |
| URL-param pagination | Client-side infinite scroll | URL params work in RSC without client state; infinite scroll needs a Client Component + IntersectionObserver |

**Installation:**
```bash
npm install recharts @supabase/ssr
```

**Version verification (performed 2026-03-31):**
- `recharts`: 3.8.1 (latest stable, March 2026)
- `@supabase/ssr`: 0.10.0 (latest stable)
- `react-is`: 19.2.4 already in node_modules — satisfies recharts peer dep

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx          # Full rewrite — RSC, server data fetch
│   │   ├── reports/page.tsx            # Full rewrite — RSC, server data fetch, URL params
│   │   └── settings/page.tsx           # Extend — add ProfileEditSection
│   └── api/
│       ├── reports/route.ts            # New — GET with platform/date/search/page filters
│       └── profile/route.ts            # New — PATCH display_name; POST avatar upload
└── components/
    ├── dashboard/
    │   ├── StatsCards.tsx              # Stats row: total analyses, platforms, plan, usage
    │   ├── ActivityFeed.tsx            # Last 10 analyses feed
    │   └── GrowthChart.tsx             # "use client" — Recharts AreaChart wrapper
    ├── reports/
    │   ├── ReportCard.tsx              # Card: handle, platform, date, score badge
    │   ├── ReportFilters.tsx           # "use client" — platform dropdown, date range, search
    │   └── Pagination.tsx              # Page nav (prev/next + page count)
    └── settings/
        └── ProfileEditSection.tsx      # "use client" — display name + avatar upload
```

### Pattern 1: Server Component Data Fetching (Dashboard + Reports)

**What:** RSC pages fetch Supabase data at render time using `createSupabaseServer()`.
**When to use:** Dashboard stats, reports list with filters — no client interactivity at the data layer.

```typescript
// Source: Established project pattern (src/app/(dashboard)/settings/page.tsx)
// dashboard/page.tsx
export default async function DashboardPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch last 10 reports for activity feed
  const { data: recentReports } = await supabase
    .from("reports")
    .select("id, platform, username, report_data, report_type, analyzed_at")
    .eq("user_id", user!.id)
    .order("analyzed_at", { ascending: false })
    .limit(10);

  // Fetch total count and distinct platforms
  const { count: totalCount } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  // ...pass as props to client components or render inline
}
```

### Pattern 2: URL-Param Pagination (Reports Page)

**What:** `searchParams` from the page props drives Supabase `.range()`. Client navigates by updating URL, RSC re-fetches automatically.
**When to use:** Reports history page (DASH-03, GROW-02).

```typescript
// Source: Verified against Supabase JS reference + supalaunch.com pagination guide
const PAGE_SIZE = 12;

export default async function ReportsPage({ searchParams }: Props) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const page = Number(searchParams.page) || 1;
  const platform = searchParams.platform ?? "";
  const search = searchParams.search ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("reports")
    .select("id, platform, username, report_data, report_type, analyzed_at", { count: "exact" })
    .eq("user_id", user!.id)
    .order("analyzed_at", { ascending: false })
    .range(from, to);

  if (platform) query = query.eq("platform", platform);
  if (search) query = query.ilike("username", `%${search}%`);

  const { data: reports, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
}
```

### Pattern 3: Recharts Growth Chart ("use client")

**What:** AreaChart wrapped in ResponsiveContainer, rendered only client-side. Data is a sorted array of `{ date, followers, engagement }` derived from the report_data JSONB array.
**When to use:** Dashboard chart preview (D-03) and any per-handle trend view (GROW-03, GROW-04).

```typescript
// Source: recharts 3.8.1 GitHub README + migration guide
"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// Data shape: derived from reports table
// [{ date: "Jan 15", followers: 12000, engagement: 3.2 }, ...]

export function GrowthChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="followersGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" stroke="#666" tick={{ fill: "#666", fontSize: 11 }} />
        <YAxis stroke="#666" tick={{ fill: "#666", fontSize: 11 }} width={45} />
        <Tooltip
          contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}
          labelStyle={{ color: "#ededed" }}
          itemStyle={{ color: "#a855f7" }}
        />
        <Area
          type="monotone"
          dataKey="followers"
          stroke="#a855f7"
          strokeWidth={2}
          fill="url(#followersGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 4: Profile Edit + Avatar Upload

**What:** A client component that (a) calls `PATCH /api/profile` to update display_name in profiles table, and (b) uploads avatar directly to Supabase Storage from the browser using `createSupabaseBrowser()`.
**When to use:** Settings page ProfileEditSection (D-12).

```typescript
// Source: Supabase Storage quickstart + supalaunch.com upload guide
// In a "use client" component:
const supabase = createSupabaseBrowser();

// Upload avatar
const filePath = `${userId}/avatar.${ext}`;
const { error: uploadError } = await supabase.storage
  .from("avatars")
  .upload(filePath, file, { upsert: true });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from("avatars")
  .getPublicUrl(filePath);

// Update profiles row
await supabase
  .from("profiles")
  .update({ avatar_url: publicUrl, display_name: displayName })
  .eq("id", userId);
```

### Pattern 5: Extract Chart Data from JSONB Report Array

**What:** For a given handle, fetch multiple reports in chronological order and extract follower counts, engagement rates from the `report_data` JSONB.
**When to use:** Building the data array for GrowthChart (GROW-03, GROW-04).

```typescript
// Source: project patterns — AnalysisReport type in src/lib/types.ts
const { data: reports } = await supabase
  .from("reports")
  .select("report_data, analyzed_at")
  .eq("user_id", userId)
  .eq("username", handle)
  .eq("report_type", "analysis")
  .order("analyzed_at", { ascending: true })
  .limit(30);

const chartData = reports?.map((r) => {
  const report = r.report_data as AnalysisReport;
  return {
    date: new Date(r.analyzed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    followers: 0,  // NOTE: followersCount lives on the profile snapshot, not AnalysisReport directly
    engagement: report.engagementStats?.rate ?? 0,
    score: report.profileScore?.overall ?? 0,
  };
}) ?? [];
```

> **IMPORTANT DATA NOTE:** `AnalysisReport` (src/lib/types.ts) does NOT contain `followersCount` directly — it contains `engagementStats`, `profileScore`, and `username`. The follower count at analysis time is in the scraped profile, not stored in `report_data`. The chart for followers will need to use either `engagementStats.estimatedReach` as a proxy, or the analyze route must be extended to also store `followersCount` in `report_data`. Check at implementation time whether the stored JSONB contains follower data (it may be serialized via the full profile + report merge).

### Anti-Patterns to Avoid

- **Importing Recharts in a Server Component:** Recharts uses `window` and DOM sizing APIs internally. Always mark Recharts wrapper components with `"use client"`. If a Server Component needs to include a chart, use `next/dynamic` with `{ ssr: false }`.
- **Storing avatar as base64 in the profiles table:** Bloats the DB row, degrades query performance, no CDN caching. Use Supabase Storage.
- **Calling `auth.updateUser()` for display_name:** The `display_name` field is in `public.profiles`, not `auth.users.user_metadata`. Update via `supabase.from("profiles").update()`.
- **Using `.eq("user_id", userId)` without auth check in API route:** Always call `supabase.auth.getUser()` first in route handlers — never trust a client-supplied userId.
- **Fetching all reports to the client for client-side filtering:** Always filter at the Supabase query level. The reports table can grow large.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-series charts | Custom SVG/Canvas chart | Recharts AreaChart/LineChart | Responsive, animated, accessible, accessible tooltips already solved |
| File upload to CDN | Multipart upload handler, signed URLs | Supabase Storage `.upload()` + `.getPublicUrl()` | Storage handles S3-backed file delivery, CDN, and RLS policies |
| Pagination offset math | Manual SQL offset strings | Supabase `.range(from, to)` with `{ count: "exact" }` | Returns total count + page slice atomically |
| Date formatting on chart axis | Custom date format function | `date-fns` (already installed) `format()` | Handles locale, DST, and edge cases |

**Key insight:** All data already exists in the `reports` table. This phase is a display layer — avoid re-processing or re-fetching data that Supabase can aggregate at the query level.

---

## Common Pitfalls

### Pitfall 1: Recharts Hydration Mismatch (SSR)
**What goes wrong:** Recharts uses `ResizeObserver` and `getBoundingClientRect` internally. If a Recharts component is in a Server Component (or a `"use client"` component that renders during SSR without a guard), you get: `Error: ResizeObserver is not defined` or a hydration mismatch on chart dimensions.
**Why it happens:** Next.js SSR renders `"use client"` components on the server for the initial HTML. Recharts tries to measure container dimensions which don't exist on the server.
**How to avoid:** Always wrap chart components in `"use client"`, AND if including them from a layout or Server Component parent, use `dynamic(() => import("..."), { ssr: false })`.
**Warning signs:** Build error mentioning `ResizeObserver` or `window is not defined`; chart renders as 0-height on first load.

### Pitfall 2: Missing `@supabase/ssr` Dependency
**What goes wrong:** `createSupabaseServer()` and `createSupabaseBrowser()` both import from `@supabase/ssr`, which is not in `package.json` or `node_modules`. Any route or page using these will throw `Cannot find module '@supabase/ssr'` at build time.
**Why it happens:** The dependency was apparently available via a worktree or was not committed to `package.json` during prior phases.
**How to avoid:** Wave 0 task must run `npm install @supabase/ssr` and add it to `package.json` as a production dependency.
**Warning signs:** `npm run build` fails immediately on the supabase imports.

### Pitfall 3: report_type Column Missing from schema.sql
**What goes wrong:** The main `src/lib/supabase/schema.sql` does NOT contain the `report_type TEXT NOT NULL DEFAULT 'analysis'` column added in Phase 4. Any new Supabase project created from the schema file would fail to run the queries in `src/app/api/analyze/route.ts` which filter on `report_type`.
**Why it happens:** The Phase 4 migration was applied as a SQL comment block in a worktree version but never merged to the main schema file.
**How to avoid:** Wave 0 adds the missing migration to `schema.sql`. The live database already has the column (no data migration needed), but the schema file must be updated for documentation correctness and future provisioning.
**Warning signs:** New Supabase project creation fails with `column reports.report_type does not exist`.

### Pitfall 4: Empty Chart Data (No Repeated Analyses)
**What goes wrong:** Charts show only a single data point (or no points) because most users haven't analyzed the same handle more than once.
**Why it happens:** Growth charts require multiple reports for the same handle over time. New users have ≤1 report per handle.
**How to avoid:** (a) Always render an empty state when `data.length < 2` with an encouraging message ("Analyze this profile again to track growth"); (b) Never error when the chart data is empty — return `null` or the empty state component.
**Warning signs:** Recharts renders a blank canvas or throws when data array is empty.

### Pitfall 5: `report_data` JSONB Doesn't Contain followerCount
**What goes wrong:** `AnalysisReport` type (src/lib/types.ts) does not have a `followersCount` field. The follower count at analysis time is in the scraped profile (`InstagramProfile.followersCount`), not in the AI-generated report. A "follower growth" chart built purely from `report_data` will have no data.
**Why it happens:** The analyze route stores only the AI report (`analysis.report`) in `report_data`, not the full profile snapshot.
**How to avoid:** At implementation time, check a real row in the `reports` table. If `followersCount` is absent, the follower chart should use `engagementStats.estimatedReach` as a proxy metric, or the plan must add a `profile_snapshot` field to `report_data` writes. This is a design decision to make at Wave 1.
**Warning signs:** `report_data.followersCount` is `undefined` in all rows.

### Pitfall 6: Avatar Upload File Size / Type Validation
**What goes wrong:** Users upload very large images or non-image files, causing slow uploads or storage bloat.
**How to avoid:** Validate on the client before upload: `file.size < 2 * 1024 * 1024` (2MB max) and `file.type.startsWith("image/")`. Display an error if validation fails.

---

## Code Examples

### Reports API Route Skeleton

```typescript
// Source: project pattern from src/app/api/analyze/route.ts + Supabase range() docs
// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const platform = searchParams.get("platform") ?? "";
  const search = searchParams.get("search") ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("reports")
    .select("id, platform, username, report_type, analyzed_at, report_data", { count: "exact" })
    .eq("user_id", user.id)
    .order("analyzed_at", { ascending: false })
    .range(from, to);

  if (platform) query = query.eq("platform", platform);
  if (search) query = query.ilike("username", `%${search}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0, page, limit: PAGE_SIZE, totalPages: Math.ceil((count ?? 0) / PAGE_SIZE) },
  });
}
```

### Profile Update API Route Skeleton

```typescript
// Source: project patterns + Supabase profiles table (schema.sql)
// src/app/api/profile/route.ts
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { display_name?: string; avatar_url?: string };

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (body.display_name) updates.display_name = body.display_name.trim().slice(0, 64);
  if (body.avatar_url) updates.avatar_url = body.avatar_url;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

### Schema Migration for Phase 5

```sql
-- Phase 5 Migration: add avatar_url to profiles table
-- Apply via: Supabase Dashboard > SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Phase 4 Migration (missing from main schema.sql): add report_type to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'analysis';
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
-- Valid values: 'analysis', 'calendar', 'comparison', 'hashtags'
```

### Supabase Storage RLS Policies for Avatars

```sql
-- Storage bucket: 'avatars' (create as public in Supabase Dashboard)
CREATE POLICY "Avatar public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatar authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Avatar own update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recharts 2.x (stable) | recharts 3.x (3.8.1) | 2024 | State management rewritten; `CategoricalChartState` removed; `Tooltip` must come before `Legend` in JSX |
| `react-smooth` (bundled) | animations maintained in recharts core | recharts 3.0 | No separate react-smooth peer dep needed |
| `recharts-scale` (bundled) | scale utilities in recharts core | recharts 3.0 | No separate recharts-scale package needed |

**Deprecated/outdated:**
- recharts 2.x `activeIndex` prop on custom components: removed in 3.x — use `useActiveTooltipLabel` hook instead
- Accessing internal recharts state via cloned props: removed in 3.x — use exported hooks

---

## Open Questions

1. **Does `report_data` JSONB contain `followersCount`?**
   - What we know: `AnalysisReport` type does not include `followersCount`; the field lives in `InstagramProfile`
   - What's unclear: Whether the analyze route stores extra profile fields beyond the AI report, or whether `report_data` is exactly the `AnalysisReport` object
   - Recommendation: At Wave 1, run `SELECT report_data->'followersCount' FROM reports LIMIT 1` against the live DB. If absent, plan adds storing follower count on report write OR uses engagement rate as the primary growth metric.

2. **Recharts `react-is` version compatibility**
   - What we know: `react-is` 19.2.4 is installed; recharts 3.8.1 requires `react-is` as a peer dep
   - What's unclear: Whether recharts 3.x requires `react-is` to match the React version (18 vs 19)
   - Recommendation: Try install; if peer dep conflict, pin `react-is@18.x` via `overrides` in package.json

3. **D-14 competitor compare from saved reports — API scope**
   - What we know: `CompetitorComparison.tsx` currently posts to `/api/compare` with fresh handles
   - What's unclear: Whether "saved reports" path bypasses the scraper entirely (using stored `report_data` directly) or still calls scraper
   - Recommendation: Use stored `report_data` directly — skip re-scraping for saved reports. Pass selected report JSONB to `/api/compare` as the profile data.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev | Yes | v22.19.0 | — |
| npm | Package install | Yes | bundled | — |
| recharts | GROW-04, D-06 | No (not installed) | — | None — must install |
| @supabase/ssr | All Supabase server/browser clients | No (not in package.json) | — | None — must install |
| react-is | recharts peer dep | Yes | 19.2.4 | — |
| date-fns | Date formatting | Yes | 4.1.0 | Use native `Intl.DateTimeFormat` |
| Supabase Storage | Avatar upload (DASH-02) | Needs bucket creation | — | Fallback: skip avatar, display name only |

**Missing dependencies with no fallback:**
- `recharts` — charts cannot be built without it; install required in Wave 0
- `@supabase/ssr` — all existing server/browser Supabase clients break without it; must be in package.json

**Missing dependencies with fallback:**
- Supabase Storage `avatars` bucket — must be created in Supabase Dashboard (not via code); if unavailable, profile edit can skip avatar in initial implementation

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + jsdom |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GROW-01 | Reports saved to Supabase on analysis | Integration (existing API test coverage) | `npx vitest run src/__tests__/api` | Partial (analyze route tests exist) |
| GROW-02 | GET /api/reports returns paginated results for authenticated user | Unit (route handler) | `npx vitest run src/__tests__/api/reports.test.ts` | No — Wave 0 gap |
| GROW-03 | Chart data array derived correctly from report_data JSONB | Unit (data transform fn) | `npx vitest run src/__tests__/lib/chart-data.test.ts` | No — Wave 0 gap |
| GROW-04 | GrowthChart renders without crashing on valid/empty data | Unit (component) | `npx vitest run src/__tests__/components/GrowthChart.test.tsx` | No — Wave 0 gap |
| DASH-01 | Dashboard page fetches and displays stats (mocked Supabase) | Unit (page component) | Manual smoke — RSC page; mock via Supabase mock | No |
| DASH-02 | PATCH /api/profile updates display_name on profiles table | Unit (route handler) | `npx vitest run src/__tests__/api/profile.test.ts` | No — Wave 0 gap |
| DASH-03 | Reports page filters by platform + search (URL params) | Unit (route handler) | `npx vitest run src/__tests__/api/reports.test.ts` | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/api/reports.test.ts` — covers GROW-02, DASH-03 (GET with filters + pagination)
- [ ] `src/__tests__/api/profile.test.ts` — covers DASH-02 (PATCH display_name + avatar_url)
- [ ] `src/__tests__/lib/chart-data.test.ts` — covers GROW-03 (transform fn from report_data to chart array)
- [ ] `src/__tests__/components/GrowthChart.test.tsx` — covers GROW-04 (render with/without data)
- [ ] Install recharts: `npm install recharts @supabase/ssr`

---

## Project Constraints (from CLAUDE.md)

All directives from the global `CLAUDE.md` and project `CLAUDE.md` apply:

| Directive | Impact on This Phase |
|-----------|---------------------|
| No mutation — always create new objects | Chart data transform functions must return new arrays/objects |
| 200-400 line files, 800 max | Split StatsCards, ActivityFeed, GrowthChart into separate files under `src/components/dashboard/` |
| Use `interface` for object shapes, `type` for unions | Define `ChartPoint`, `ReportCardData` etc. as interfaces |
| `@/*` imports only — no relative paths | All new files use `@/components/...`, `@/lib/...` |
| "use client" for interactive components | ProfileEditSection, ReportFilters, GrowthChart, Pagination all need "use client" |
| No hardcoded secrets | Supabase env vars only via `process.env.NEXT_PUBLIC_*` |
| Validate all user input at boundaries | Profile API: validate `display_name` length/chars; avatar: validate file type and size before upload |
| No `console.log` in production code | Use `console.error` for non-fatal fallbacks only, matching existing pattern |
| Explicit return types on exported async functions | All new route handlers and lib functions need explicit return type annotations |
| Immutable patterns — no mutation | `update` calls return new objects; no in-place field assignment |

---

## Sources

### Primary (HIGH confidence)
- recharts GitHub repository — version 3.8.1 confirmed, `react-is` peer dep, migration guide
- Supabase JS reference — `.range()`, `.select({ count: 'exact' })`, `.from().update()` patterns
- Project codebase — `schema.sql`, `src/lib/types.ts`, `src/app/api/analyze/route.ts`, existing settings/dashboard stubs

### Secondary (MEDIUM confidence)
- [supalaunch.com pagination guide](https://supalaunch.com/blog/supabase-nextjs-pagination) — URL-param pagination with `searchParams`, range() pattern
- [supalaunch.com storage guide](https://supalaunch.com/blog/file-upload-nextjs-supabase) — avatar upload with Supabase Storage vs base64 tradeoffs
- [Supabase storage quickstart](https://supabase.com/docs/guides/storage/quickstart) — bucket creation, upload, public URL pattern

### Tertiary (LOW confidence)
- WebSearch results on Recharts dark theme styling — no single authoritative source; patterns are well-established community conventions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from npm registry and package-lock
- Architecture: HIGH — all patterns are extensions of established project patterns
- Pitfalls: HIGH — most derived from direct code inspection (missing @supabase/ssr, missing report_type in schema, no followersCount in AnalysisReport)
- Recharts API: MEDIUM — confirmed from official GitHub README and migration guide; detailed API shape from community sources

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (recharts 3.x stable; Supabase JS stable)
