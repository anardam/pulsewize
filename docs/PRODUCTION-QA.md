# Production QA Checklist

Use this checklist against the deployed Vercel environment before launch.

## Environment

- `OPENROUTER_API_KEY` is configured in Vercel.
- `NEXT_PUBLIC_SITE_URL` matches the production domain.
- Supabase production keys are configured.
- Google OAuth redirect URIs point to production callbacks.
- Meta OAuth / business login redirect URIs point to production callbacks.
- `CONNECTED_ACCOUNT_TOKEN_SECRET` is configured in Vercel.
- `NEXT_PUBLIC_DISABLE_USAGE_LIMITS` is not enabled in production.

## Auth and onboarding

- Sign up works from the production domain.
- Login works from the production domain.
- Logout returns the user to a safe public route.
- Password reset / update flow works if enabled.

## Public profile analysis

- Instagram public profile analysis succeeds.
- YouTube public profile analysis succeeds for an existing handle.
- Facebook public profile analysis succeeds for an existing page/profile URL.
- Invalid usernames show a helpful failure state instead of a crash.
- Free-tier usage increments correctly after a successful analysis.
- Cached repeat analysis returns quickly within the cache window.

## Connected accounts

- YouTube connect completes and returns to the dashboard.
- Facebook connect completes and returns to the dashboard.
- Instagram connect completes and returns to the dashboard.
- Connected accounts show the correct display name, handle, and sync timestamp.
- Manual refresh for a connected account succeeds.
- Analyze connected account succeeds and saves a report with official data source.

## Reports and product flows

- Generated reports render without runtime errors.
- Recent activity updates after a new analysis.
- Momentum chips appear when repeated profiles exist.
- Export / download actions work if exposed in production.
- Reports history loads and filtering works.

## Billing and limits

- Free user sees the correct usage state.
- Upgrade prompts appear only when appropriate.
- Pro user can run analysis without free-tier blocking.
- Subscription checkout works end to end.
- Cancel subscription flow works end to end.

## SEO and metadata

- `/robots.txt` is accessible.
- `/sitemap.xml` is accessible.
- `/llms.txt` is accessible.
- Open Graph image renders for the homepage.
- Canonical URL uses the production domain.

## Observability

- Vercel logs show structured events for analysis requests.
- OAuth callback failures show request IDs and platform context.
- Refresh failures show request IDs and account context.
- At least one forced error path is checked to confirm logs are visible in production.
