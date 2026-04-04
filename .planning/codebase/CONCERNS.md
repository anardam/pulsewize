# Codebase Concerns

**Analysis Date:** 2026-03-31

## Security Considerations

**API Key Transmitted via HTTP Header:**
- Risk: The Anthropic API key is stored in `localStorage` on the client and sent to the server via the `x-api-key` HTTP header. While the claim is "it never touches any server," the key IS sent to the Next.js backend in `src/app/page.tsx` line 54 (`headers["x-api-key"] = apiKey`), then forwarded to the Anthropic API from the server in `src/app/api/analyze/route.ts` line 23.
- Files: `src/components/ApiKeyModal.tsx`, `src/app/page.tsx`, `src/app/api/analyze/route.ts`
- Current mitigation: None. The UI text at line 200 of `src/app/page.tsx` states "Your key is stored only in your browser -- it never touches any server" which is misleading since the key transits through the Next.js server.
- Recommendations: Either (a) call the Anthropic API directly from the client to honor the claim, or (b) update the UI copy to accurately state the key passes through the server. Additionally, the server should never log the API key value.

**Hardcoded Instagram App ID:**
- Risk: The `X-IG-App-ID` header value `936619743392459` is hardcoded in `src/lib/instagram.ts` line 15. This is a well-known public app ID, but hardcoding it means if Instagram rotates it, the scraper breaks silently.
- Files: `src/lib/instagram.ts` line 15
- Current mitigation: None.
- Recommendations: Move to an environment variable or config constant with a fallback.

**Instagram Credentials Passed via Command-Line Arguments:**
- Risk: In `src/app/api/insta-login/route.ts` lines 50-51, the Instagram username and password are passed as command-line arguments to a Python script (`[tmpPath, igUsername, igPassword]`). Command-line arguments are visible in process listings (`ps aux`).
- Files: `src/app/api/insta-login/route.ts`
- Current mitigation: None.
- Recommendations: Pass credentials via stdin or environment variables to the child process, not as argv.

**No Input Sanitization on Username:**
- Risk: The username input is only trimmed and has `@` stripped. No validation against path traversal, injection, or excessively long values. The username is interpolated into URLs and shell commands.
- Files: `src/lib/instagram.ts` line 8, `src/lib/scraper-rapidapi.ts` line 19, `src/lib/scraper-puppeteer.ts` line 71, `src/lib/instaloader.ts` lines 102-103
- Current mitigation: `encodeURIComponent` is used for URL interpolation in some scrapers but not all. The Puppeteer scraper at `src/lib/scraper-puppeteer.ts` line 93 directly interpolates the username into the URL string without encoding.
- Recommendations: Add a strict username validator (alphanumeric, dots, underscores, max 30 chars per Instagram rules) at the API route level before passing to any scraper.

**No CSRF Protection on API Endpoints:**
- Risk: The `/api/analyze` and `/api/insta-login` POST endpoints have no CSRF token validation.
- Files: `src/app/api/analyze/route.ts`, `src/app/api/insta-login/route.ts`
- Current mitigation: None beyond same-origin policy.
- Recommendations: Add CSRF token validation or verify the `Origin`/`Referer` header matches the expected domain.

## Performance Bottlenecks

**Sequential Scraper Fallback Chain:**
- Problem: The analyze route tries up to 4 scrapers sequentially (Puppeteer -> Instaloader -> RapidAPI -> Instagram API on local; RapidAPI -> Instagram API on Vercel). Each has a 15-60 second timeout.
- Files: `src/app/api/analyze/route.ts` lines 70-157
- Cause: Worst case, a single request can take 15s + 60s + 15s + 15s = 105 seconds if all scrapers fail, far exceeding Vercel's default 10s function timeout.
- Improvement path: Run scrapers in parallel with `Promise.race` or `Promise.any` instead of sequential fallback. Set the Vercel function `maxDuration` in `next.config.mjs` or route config.

**Heavy Dependencies for Serverless:**
- Problem: `puppeteer-core` and `@sparticuz/chromium` add significant cold-start time and bundle size to the serverless function. The `natural` NLP library is also large (~5MB).
- Files: `package.json` lines 12-18
- Cause: These are heavyweight libraries loaded into every invocation of the analyze endpoint.
- Improvement path: Split the analyze route into separate API routes (one for scraping, one for analysis) so the NLP/Puppeteer deps are only loaded when needed. Consider lighter NLP alternatives or moving NLP to the client.

**Claude CLI 4-Minute Timeout:**
- Problem: The Claude CLI fallback spawns a child process with a 240-second timeout (`src/lib/claude-cli.ts` line 98). This is excessive for a web request and will time out on Vercel.
- Files: `src/lib/claude-cli.ts` line 98
- Cause: The CLI path is designed for local use but the code doesn't guard against it running on Vercel.
- Improvement path: The CLI path should be disabled on Vercel entirely (it already partially is, but the code still falls through to CLI if API key is missing).

## Tech Debt

**Duplicated JSON Parsing Logic:**
- Issue: The JSON extraction pattern (strip markdown fences, find first/last braces, `JSON.parse`) is duplicated identically in `src/lib/claude-api.ts` lines 34-48 and `src/lib/claude-cli.ts` lines 108-119.
- Files: `src/lib/claude-api.ts`, `src/lib/claude-cli.ts`
- Impact: Bug fixes to JSON parsing must be applied in two places.
- Fix approach: Extract a shared `parseClaudeJsonResponse(raw: string): AnalysisReport` utility function.

**Duplicated Python Path Resolution:**
- Issue: The `VENV_PYTHON` constant and `getPython()` function are duplicated in `src/lib/instaloader.ts` lines 11-17 and `src/app/api/insta-login/route.ts` lines 10-15.
- Files: `src/lib/instaloader.ts`, `src/app/api/insta-login/route.ts`
- Impact: Maintenance burden; changes must be synchronized.
- Fix approach: Extract to a shared utility like `src/lib/python.ts`.

**ReportDashboard.tsx is 1001 Lines:**
- Issue: This single component file handles score rings, engagement stats, content pillars, action items, PDF export, comparison views, and more.
- Files: `src/components/ReportDashboard.tsx`
- Impact: Hard to maintain, test, or modify individual sections. Exceeds the recommended 800-line limit.
- Fix approach: Extract into sub-components: `ScoreRing`, `EngagementCard`, `ActionItemList`, `ContentCalendar`, `PdfExportButton`, etc.

**Hardcoded Model Name:**
- Issue: The Claude model is hardcoded as `"claude-sonnet-4-20250514"` in `src/lib/claude-api.ts` line 19.
- Files: `src/lib/claude-api.ts` line 19
- Impact: Requires a code change to update the model version.
- Fix approach: Move to an environment variable with a default: `process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514"`.

**Hardcoded Rate Limit Constants:**
- Issue: `MAX_REQUESTS = 5` and `WINDOW_MS = 60 * 60 * 1000` are hardcoded in `src/lib/rate-limit.ts` lines 8-9.
- Files: `src/lib/rate-limit.ts`
- Impact: Cannot adjust rate limits without code changes.
- Fix approach: Read from environment variables with defaults.

**In-Memory Rate Limiting:**
- Issue: Rate limiting uses a simple `Map<string, RateLimitEntry>` in `src/lib/rate-limit.ts` line 6. This resets on every serverless cold start and doesn't work across multiple instances.
- Files: `src/lib/rate-limit.ts`
- Impact: Rate limiting is effectively non-functional on Vercel (each function invocation may get a fresh instance). Memory leak potential on long-running local server since entries are never cleaned up.
- Fix approach: Use Vercel KV, Upstash Redis, or a similar external store for rate limiting. Add periodic cleanup of expired entries for local use.

## Missing Error Handling

**Unvalidated Claude API Response Shape:**
- Issue: The JSON response from Claude is parsed and cast directly to `AnalysisReport` without any runtime validation in both `src/lib/claude-api.ts` line 48 and `src/lib/claude-cli.ts` line 119. If Claude returns a malformed or partial JSON object, the app will render broken data.
- Files: `src/lib/claude-api.ts` line 48, `src/lib/claude-cli.ts` line 119
- Impact: Crash or undefined behavior in `ReportDashboard.tsx` when accessing nested properties like `report.profileScore.breakdown.contentQuality`.
- Fix approach: Add Zod schema validation for the `AnalysisReport` type. Return a clear error if the response doesn't match.

**Unvalidated Manual Entry Input:**
- Issue: The `ManualEntryForm` submits data without validation beyond HTML `required` and `min={0}` attributes. No server-side validation exists in `src/app/api/analyze/route.ts` -- the `manualData` body field is used as-is.
- Files: `src/components/ManualEntryForm.tsx`, `src/app/api/analyze/route.ts` line 64
- Impact: Users can submit nonsensical data (e.g., negative numbers via API client, missing required fields).
- Fix approach: Add Zod schema validation for `ManualProfileInput` on the server side in the analyze route.

**Silent Error Swallowing in Scraper Chain:**
- Issue: Multiple `catch` blocks in `src/app/api/analyze/route.ts` (lines 83, 98, 128, 143) catch errors and silently continue with only `lastError` being set as a string. The original error stack trace is lost.
- Files: `src/app/api/analyze/route.ts`
- Impact: Debugging scraper failures is difficult because the root cause error is discarded.
- Fix approach: Log the full error object (with stack trace) before continuing to the next scraper.

## Scalability Concerns

**Vercel Function Timeout:**
- Problem: The analyze endpoint orchestrates scraping + NLP + AI analysis in a single request. On Vercel's Hobby plan, the default function timeout is 10 seconds. Even on Pro, it's 60 seconds. The scraper chain alone can take 30+ seconds.
- Files: `src/app/api/analyze/route.ts`
- Limit: Vercel Hobby 10s, Pro 60s, Enterprise 900s.
- Scaling path: Implement a background job pattern: (1) POST returns a job ID immediately, (2) processing happens asynchronously (Vercel Cron, Inngest, or similar), (3) client polls for completion. Alternatively, use Vercel's streaming responses.

**No Caching of Analysis Results:**
- Problem: Every request for the same username triggers a full scrape + AI analysis cycle, consuming API credits and time.
- Files: `src/app/api/analyze/route.ts`
- Current capacity: No caching at all.
- Scaling path: Cache scraper results for a configurable TTL (e.g., 1 hour). Cache AI analysis results keyed by profile data hash.

## Dependencies at Risk

**Instagram Scraping Fragility:**
- Risk: All three scraping methods (public API, Puppeteer, Instaloader) rely on unofficial/undocumented Instagram endpoints or screen scraping. Instagram actively blocks automated access.
- Impact: Any Instagram API change or rate limit enforcement breaks all scrapers simultaneously. The `web_profile_info` endpoint in `src/lib/instagram.ts` is frequently blocked.
- Migration plan: The manual entry fallback exists but degrades UX significantly. Consider adding official Instagram Basic Display API or Graph API integration as a first-class option.

**RapidAPI Provider Dependency:**
- Risk: The RapidAPI scrapers in `src/lib/scraper-rapidapi.ts` depend on third-party providers (`instagram-scraper-20251`, `instagram-scraper-api2`) that can change their API contract, raise prices, or disappear.
- Impact: Scraping breaks without warning.
- Migration plan: The multi-provider fallback is good defensive design. Add monitoring/alerting for provider failures.

**`google-trends-api` is Unofficial:**
- Risk: The `google-trends-api` package in `src/lib/trends.ts` scrapes Google Trends without an official API. Google frequently changes its interface.
- Impact: Trend data becomes unavailable; the graceful fallback to "stable" masks the failure.
- Migration plan: Consider Google's official Trends API or treat trend data as optional/best-effort (which it already is).

## Test Coverage Gaps

**Zero Test Coverage:**
- What's not tested: The entire codebase has zero test files. No unit tests, integration tests, or E2E tests exist.
- Files: All files in `src/lib/` and `src/components/` and `src/app/api/`
- Risk: Any refactoring or feature addition can break existing functionality without detection. The JSON parsing logic, rate limiting, NLP analysis, and scraper response parsing are all candidates for regression bugs.
- Priority: High. Recommended test priorities:
  1. `src/lib/rate-limit.ts` - Pure function, easy to unit test
  2. `src/lib/nlp.ts` - Pure function, testable with fixture captions
  3. `src/lib/scraper-rapidapi.ts` `parseResponse` - Complex parsing logic with many edge cases
  4. `src/lib/claude-api.ts` / `src/lib/claude-cli.ts` - JSON extraction logic
  5. `src/lib/prompt.ts` - Prompt construction
  6. `src/app/api/analyze/route.ts` - Integration test with mocked scrapers

## Missing Critical Features

**No Request Logging or Observability:**
- Problem: There is no structured logging, request tracing, or error reporting. The only logging is `console.error` in `src/lib/nlp.ts` line 122, `src/lib/trends.ts` line 68, and `src/components/ReportDashboard.tsx` line 235.
- Blocks: Debugging production issues, understanding usage patterns, monitoring scraper health.

**No Loading/Progress Indication for Long Operations:**
- Problem: The `LoadingScreen` component shows a static animation with no indication of which step is in progress (scraping, analyzing, etc.). The operation can take 30+ seconds.
- Files: `src/components/LoadingScreen.tsx`
- Blocks: Users have no way to know if the request is progressing or stuck.

**No Retry Mechanism for Transient Failures:**
- Problem: If the Claude API call or a scraper fails due to a transient network error, the entire analysis fails. There is no automatic retry logic anywhere.
- Files: `src/lib/claude-api.ts`, `src/lib/scraper-rapidapi.ts`, `src/lib/instagram.ts`
- Blocks: Reliability in production environments with intermittent connectivity.

---

*Concerns audit: 2026-03-31*
