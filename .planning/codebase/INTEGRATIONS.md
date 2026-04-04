# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**AI Analysis:**
- Anthropic Claude API - Core AI engine that analyzes Instagram profiles and generates growth strategy reports
  - SDK: `@anthropic-ai/sdk` ^0.80.0
  - Client: `src/lib/claude-api.ts`
  - Model: `claude-sonnet-4-20250514` (hardcoded in `src/lib/claude-api.ts` line 19)
  - Max tokens: 8192
  - Auth: `ANTHROPIC_API_KEY` env var OR client-provided via `x-api-key` request header
  - Fallback: Claude Code CLI via `claude --print` piped command (`src/lib/claude-cli.ts`)

**Instagram Data Scraping (4 methods, cascading fallback):**

1. **RapidAPI Instagram Scrapers** - Primary on Vercel
   - Client: `src/lib/scraper-rapidapi.ts`
   - Two providers attempted in order:
     - `instagram-scraper-20251.p.rapidapi.com` (Instagram Scraper 2025)
     - `instagram-scraper-api2.p.rapidapi.com` (Instagram Scraper API v2)
   - Auth: `RAPIDAPI_KEY` env var passed as `x-rapidapi-key` header
   - Timeout: 15 seconds per provider

2. **Instagram Public Web API** - Fallback scraper
   - Client: `src/lib/instagram.ts`
   - Endpoint: `https://www.instagram.com/api/v1/users/web_profile_info/`
   - Auth: Hardcoded `X-IG-App-ID: 936619743392459` header
   - Timeout: 15 seconds
   - No API key required (public endpoint, rate-limited by Instagram)

3. **Puppeteer Headless Browser** - Primary on local, unavailable on Vercel
   - Client: `src/lib/scraper-puppeteer.ts`
   - Scrapes `https://www.instagram.com/{username}/` via headless Chrome
   - Extracts data from meta tags, `window._sharedData`, and header DOM elements
   - On Vercel: Uses `@sparticuz/chromium` for serverless Chromium binary
   - On local: Auto-detects Chrome/Chromium from standard install paths
   - Timeout: 20 seconds for page load

4. **Instaloader (Python)** - Local-only fallback
   - Client: `src/lib/instaloader.ts`
   - Spawns inline Python script via `child_process.execFile`
   - Requires Python 3 with `instaloader` package installed
   - Supports authenticated sessions from `~/.config/instaloader/session-*`
   - Timeout: 60 seconds

**Scraping Strategy by Environment** (defined in `src/app/api/analyze/route.ts`):
- **Vercel**: RapidAPI -> Instagram Public API -> Manual entry fallback
- **Local**: Puppeteer -> Instaloader -> RapidAPI -> Instagram Public API -> Manual entry fallback

**NLP Processing:**
- `natural` library (local, no external API)
  - Client: `src/lib/nlp.ts`
  - TF-IDF keyword/theme extraction from captions
  - Sentiment analysis using AFINN lexicon via `SentimentAnalyzer`
  - No external service calls

**Trend Analysis:**
- Google Trends (unofficial API)
  - Client: `src/lib/trends.ts`
  - Package: `google-trends-api`
  - Queries `interestOverTime` for 90-day trend data on content niche keyword
  - No API key required (uses unofficial Google Trends scraping)

## Data Storage

**Databases:**
- None. No database is used.

**Client-Side Storage:**
- `localStorage` for report history (`src/lib/report-history.ts`)
  - Key: `instaanalyse_reports`
  - Stores last 20 analysis summaries (extracted scores, not full reports)
  - Used for before/after comparison when re-analyzing a profile
- `localStorage` for Anthropic API key (`src/components/ApiKeyModal.tsx`)
  - Key stored client-side only, never sent to server storage

**File Storage:**
- Temporary files in `os.tmpdir()` for Python scripts (auto-cleaned)
- No persistent file storage

**Caching:**
- In-memory rate limiting only (`src/lib/rate-limit.ts`)
  - `Map<string, RateLimitEntry>` - resets on server restart
  - 5 requests per IP per hour window

## Authentication & Identity

**Auth Provider:**
- None. No user authentication system exists.

**API Key Management:**
- Anthropic API key: Client stores in `localStorage`, sends via `x-api-key` header on each request
- Server can also have `ANTHROPIC_API_KEY` env var as fallback
- RapidAPI key: Server-side only via `RAPIDAPI_KEY` env var
- Instagram login (Instaloader): Optional, via `src/app/api/insta-login/route.ts` POST endpoint accepting `igUsername`/`igPassword` to create a session file

## Monitoring & Observability

**Error Tracking:**
- None. No error tracking service integrated.

**Logs:**
- `console.error` used sparingly in `src/lib/nlp.ts` and `src/lib/trends.ts`
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Vercel (detected via `process.env.VERCEL`)
- Local development via `next dev`

**CI Pipeline:**
- None detected (no GitHub Actions, no CI config files)

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Required unless client provides API key via browser. Used for Claude AI analysis.

**Optional env vars:**
- `RAPIDAPI_KEY` - Enables RapidAPI Instagram scraping (primary method on Vercel)
- `VERCEL` - Auto-set by Vercel; determines scraping fallback order

**Secrets location:**
- No `.env` file committed
- Server env vars configured via Vercel dashboard or local shell environment
- Client-side API key stored in browser `localStorage`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## API Endpoints

**Internal API Routes (Next.js App Router):**

| Method | Path | Purpose | File |
|--------|------|---------|------|
| POST | `/api/analyze` | Main analysis endpoint; scrapes profile + runs AI analysis | `src/app/api/analyze/route.ts` |
| GET | `/api/health` | Health check; verifies CLI/API key availability | `src/app/api/health/route.ts` |
| POST | `/api/insta-login` | Saves Instaloader session via Instagram credentials | `src/app/api/insta-login/route.ts` |

## Data Flow

**Analysis Pipeline:**
1. Client sends username or manual data to `/api/analyze`
2. Server attempts Instagram profile scraping via cascading providers
3. If scraping fails, returns `requiresManualEntry: true` (HTTP 422) for client to show manual form
4. On success, runs NLP caption analysis and Google Trends query in parallel
5. Sends profile data + NLP + trend context to Claude API (or CLI) with structured prompt
6. Claude returns JSON analysis report
7. Server attaches NLP/trend data to report and returns to client
8. Client stores summary in `localStorage` for historical comparison

---

*Integration audit: 2026-03-31*
