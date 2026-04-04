# Phase 5: Growth Tracking and Dashboard - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the persistent user home: full analytics dashboard with stats and charts, report history page with card grid and filters, growth trend charts using Recharts, profile editing in Settings, and the deferred "compare from saved reports" feature from Phase 4. All data comes from the Supabase `reports` table (already populated by Phase 4 cache writes).

</domain>

<decisions>
## Implementation Decisions

### Dashboard Home (/dashboard)
- **D-01:** Full analytics dashboard — detailed stats cards, chart previews, activity feed, saved profiles list
- **D-02:** Stats cards: total analyses, platforms analyzed, Pro status, this month's usage
- **D-03:** Chart preview: follower/engagement trends for most-analyzed profile
- **D-04:** Recent activity feed: last 10 analyses with platform icon, handle, date
- **D-05:** Quick "Analyze" CTA button prominent on dashboard

### Growth Trend Charts
- **D-06:** Use Recharts library — React-native, Tailwind-friendly, SSR compatible
- **D-07:** Chart metrics: engagement rate, profile score, and estimated reach over time (follower count and posting frequency are not stored in report_data JSONB — use available AnalysisReport fields instead)
- **D-08:** Charts show data from saved reports for a specific handle — each analysis snapshot becomes a data point

### Report History (/reports)
- **D-09:** Card grid layout — each card shows handle, platform icon, date, profile score, report type
- **D-10:** Filters: platform dropdown, date range picker, search by handle
- **D-11:** Pagination or infinite scroll for large report histories

### Account Settings (/settings)
- **D-12:** Add profile editing — display name and avatar upload
- **D-13:** Keep existing: account info, billing section, danger zone (from Phases 1+3)

### Deferred from Phase 4
- **D-14:** Add "compare from saved reports" option to CompetitorComparison component — user can select 2-3 saved reports to compare instead of entering new handles

### Claude's Discretion
- Recharts chart type selection (Line, Area, Bar for different metrics)
- Avatar upload storage (Supabase Storage vs base64 in profile)
- Pagination vs infinite scroll for reports page
- Activity feed data structure

</decisions>

<canonical_refs>
## Canonical References

### Existing Pages (stubs to flesh out)
- `src/app/(dashboard)/dashboard/page.tsx` — Dashboard stub
- `src/app/(dashboard)/reports/page.tsx` — Reports stub
- `src/app/(dashboard)/settings/page.tsx` — Settings with account + billing (keep, extend)

### Data Layer
- `src/lib/supabase/schema.sql` — `reports` table (platform, username, report_data, report_type, created_at)
- `src/app/api/analyze/route.ts` — Already writes to reports table (Phase 4 cache)

### UI Components
- `src/components/ReportDashboard.tsx` — Renders reports with tabs (Overview, Compare, Calendar, Hashtags)
- `src/components/billing/BillingSection.tsx` — Billing UI in settings
- `.planning/phases/01-foundation/01-UI-SPEC.md` — Dark theme, spacing, typography

### Phase 4 Component (extend)
- `src/components/CompetitorComparison.tsx` — Add saved-reports selection path (D-14)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Reports table with `report_data` JSONB — all analysis data already persisted
- `report-history.ts` — localStorage history (legacy, but pattern reference)
- Dashboard/Reports/Settings stubs — structure exists, needs content
- Supabase server client — data fetching pattern established

### Integration Points
- `src/app/(dashboard)/dashboard/page.tsx` — full rewrite from stub
- `src/app/(dashboard)/reports/page.tsx` — full rewrite from stub
- `src/app/(dashboard)/settings/page.tsx` — extend with profile edit
- `src/app/api/reports/route.ts` — new API for fetching/filtering reports
- `src/app/api/profile/route.ts` — new API for updating display name/avatar

</code_context>

<specifics>
## Specific Ideas

- Dashboard should feel like a command center — the first thing a user sees after login
- Charts should use the purple gradient accent color for data lines
- Report cards should show a mini score badge (color-coded: green/yellow/red)
- Empty states should be encouraging: "Run your first analysis to see trends here"

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase

</deferred>

---

*Phase: 05-growth-tracking-and-dashboard*
*Context gathered: 2026-03-31*
