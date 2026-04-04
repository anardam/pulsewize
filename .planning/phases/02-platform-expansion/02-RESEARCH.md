# Phase 2: Platform Expansion - Research

**Researched:** 2026-03-31
**Domain:** Multi-platform social media scraping, type system design, platform health monitoring, per-platform AI prompts
**Confidence:** MEDIUM-HIGH (YouTube HIGH via official API; ScrapeCreators MEDIUM via live doc fetch; health check pattern HIGH via Vercel docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Platform card grid on /analyze page — user clicks a platform card, then enters handle on the next step
- **D-02:** Remember last used platform (localStorage or Supabase user preferences)
- **D-03:** Platform health indicator on each card — if a scraper is known-down, show it before the user commits
- **D-04:** YouTube — official YouTube Data API v3. Requires `YOUTUBE_API_KEY` env var. Free 10K units/day.
- **D-05:** Twitter/X, TikTok, LinkedIn, Facebook — Claude's discretion on best provider per platform
- **D-06:** Each platform scraper follows the existing cascade pattern (primary → fallback → error)
- **D-07:** NO manual entry for new platforms. Only Instagram keeps its existing manual entry fallback.
- **D-08:** Scraping failure shows "Unable to fetch profile. Try again later." with a retry button. No form fallback.
- **D-09:** Claude's discretion on type strategy — unified NormalizedProfile with platform-specific extras vs per-platform types
- **D-10:** AI prompts MUST be customized per platform — YouTube focuses on video strategy, Twitter on thread/engagement, TikTok on trending content, LinkedIn on professional positioning, Facebook on community engagement

### Claude's Discretion
- Scraping API selection for Twitter/X, TikTok, LinkedIn, Facebook (based on research)
- NormalizedProfile type strategy (unified vs per-platform)
- Platform health check implementation (polling, canary, or on-demand)
- Scraper cascade order per platform

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAT-01 | YouTube channel scraping via YouTube Data API v3 | Official API confirmed free, forHandle param available, googleapis npm at v171.4.0 |
| PLAT-02 | Twitter/X profile scraping via third-party API with fallback | ScrapeCreators /v1/twitter/profile confirmed live, response shape documented |
| PLAT-03 | TikTok profile scraping via third-party API with fallback | ScrapeCreators /v1/tiktok/profile confirmed live, stats object documented |
| PLAT-04 | LinkedIn profile scraping via third-party API | ScrapeCreators /v1/linkedin/profile uses URL param; note reliability concerns |
| PLAT-05 | Facebook page scraping via third-party API | ScrapeCreators /v1/facebook/profile confirmed live; public pages only |
| PLAT-06 | Each platform returns normalized data matching existing InstagramProfile shape | Unified NormalizedProfile union type recommended; NlpResult can be applied universally |
| PLAT-07 | Platform health monitoring (canary checks for scraper availability) | Vercel Cron confirmed; pattern documented with CRON_SECRET + Supabase write |

</phase_requirements>

---

## Summary

Phase 2 adds five new platform scrapers (YouTube, Twitter/X, TikTok, LinkedIn, Facebook) to the existing PlatformScraper registry pattern established in Phase 1. The registry, cascade pattern, and scraper interface are already in place — this phase is additive, not architectural.

**ScrapeCreators** (already referenced in the project's STACK.md research) is the recommended primary provider for Twitter/X, TikTok, LinkedIn, and Facebook. Its API was verified live with endpoints at `docs.scrapecreators.com`. The shared `SCRAPECREATORS_API_KEY` (or the existing `RAPIDAPI_KEY`) is used across all four platforms via a single header. YouTube uses the official YouTube Data API v3 via the `googleapis` npm package with an API key (no OAuth required for public channel data).

The biggest design decisions for this phase are: (1) the NormalizedProfile type strategy — research supports a **unified base + discriminated union** approach that keeps the AI prompt pipeline working without platform-specific branching at the route layer; and (2) the platform health check — a Vercel Cron job writing canary results to Supabase is the correct pattern, with client-side polling to surface status on platform cards.

**Primary recommendation:** Use ScrapeCreators for all non-YouTube platforms with `SCRAPECREATORS_API_KEY`. Implement the NormalizedProfile type as a discriminated union with a `platform` discriminant and a shared base. Run a Vercel Cron canary every 15 minutes writing results to a `platform_health` Supabase table. Surface health on cards via a lightweight GET endpoint.

---

## Project Constraints (from CLAUDE.md)

| Directive | Application to Phase 2 |
|-----------|----------------------|
| No `console.log` in production code — use proper logging | Scrapers must not use console.log; use console.error only for actual errors |
| ALWAYS validate at system boundaries | Zod schemas required for each platform's scraper API response before mapping to NormalizedProfile |
| No hardcoded secrets | `SCRAPECREATORS_API_KEY`, `YOUTUBE_API_KEY` must come from `process.env.*` with startup validation |
| Files max 800 lines, 200-400 typical | Each platform scraper should be its own file under `src/lib/scrapers/{platform}/` |
| Functions max 50 lines | `mapToNormalizedProfile()` and `runCascade()` in separate functions |
| Use `interface` for object shapes, `type` for unions | NormalizedProfile should be a `type` union; per-platform shapes should be `interface` |
| Immutable patterns — never mutate | All scraper mapping functions return new objects |
| `@/*` import alias required — no relative paths | `import type { NormalizedProfile } from "@/lib/scrapers/types"` |
| All exported functions need explicit return types | `async function scrape(username: string): Promise<ScraperResult>` |
| Components: PascalCase; lib modules: kebab-case | `PlatformGrid.tsx`, `platform-card.tsx` vs `src/lib/scrapers/twitter/index.ts` |
| Tailwind only — no CSS modules | Platform card grid uses Tailwind grid classes |
| `useLocalStorage` pattern via useState + useEffect | For persisting last selected platform (D-02) |

---

## Standard Stack

### Core (existing — no new installs required for scrapers)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 (installed) | Validate scraper API responses | Already in package.json; boundary validation per CLAUDE.md |
| RAPIDAPI_KEY env var | existing | Used by ScrapeCreators as primary key | Already configured per Phase 1 |

### New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| googleapis | 171.4.0 (latest) | YouTube Data API v3 client | YouTube scraper only (D-04) |

**Install:**
```bash
npm install googleapis
```

**Version verified:** `npm view googleapis version` → `171.4.0` (2026-03-31)

### API Providers (not npm packages — accessed via fetch)

| Platform | Primary Provider | Endpoint | Auth Header | Fallback |
|----------|-----------------|----------|-------------|----------|
| Twitter/X | ScrapeCreators | `GET /v1/twitter/profile?handle={handle}` | `x-api-key: SCRAPECREATORS_API_KEY` | Error + retry (D-07) |
| TikTok | ScrapeCreators | `GET /v1/tiktok/profile?handle={handle}` | `x-api-key: SCRAPECREATORS_API_KEY` | Error + retry (D-07) |
| LinkedIn | ScrapeCreators | `GET /v1/linkedin/profile?url={profileUrl}` | `x-api-key: SCRAPECREATORS_API_KEY` | Error + retry (D-07) |
| Facebook | ScrapeCreators | `GET /v1/facebook/profile?url={pageUrl}` | `x-api-key: SCRAPECREATORS_API_KEY` | Error + retry (D-07) |
| YouTube | Official Google API | `channels.list(part: "snippet,statistics", forHandle: handle)` | `key: YOUTUBE_API_KEY` | ScrapeCreators `/v1/youtube/channel` fallback |

**ScrapeCreators base URL:** `https://api.scrapecreators.com` (verify with docs; x-api-key header required)

**Confidence note:** ScrapeCreators endpoint paths verified live via `docs.scrapecreators.com` fetch on 2026-03-31. Response field names verified from live docs pages. Schema validation via Zod is mandatory because third-party APIs may change without notice.

---

## Architecture Patterns

### Recommended Directory Structure

```
src/lib/scrapers/
├── types.ts                  # NormalizedProfile union, ScraperResult, PlatformScraper
├── registry.ts               # Add youtube, twitter, tiktok, linkedin, facebook entries
├── instagram/
│   ├── index.ts              # InstagramScraper (existing)
│   └── cascade.ts            # (existing)
├── youtube/
│   ├── index.ts              # YouTubeScraper implements PlatformScraper
│   ├── client.ts             # googleapis youtube client setup
│   └── mapper.ts             # channelToNormalizedProfile()
├── twitter/
│   ├── index.ts              # TwitterScraper implements PlatformScraper
│   └── mapper.ts             # twitterProfileToNormalizedProfile()
├── tiktok/
│   ├── index.ts              # TikTokScraper implements PlatformScraper
│   └── mapper.ts             # tiktokProfileToNormalizedProfile()
├── linkedin/
│   ├── index.ts              # LinkedInScraper implements PlatformScraper
│   └── mapper.ts             # linkedinProfileToNormalizedProfile()
└── facebook/
    ├── index.ts              # FacebookScraper implements PlatformScraper
    └── mapper.ts             # facebookProfileToNormalizedProfile()

src/lib/
├── prompt.ts                 # Expand to buildPlatformPrompt(platform, profile, nlp, trend)
└── platform-health.ts        # getPlatformHealth() — reads from Supabase

src/app/api/
├── analyze/route.ts          # No changes needed (registry + platform param already work)
└── platform-health/route.ts  # GET: returns platform health map from Supabase

src/app/(dashboard)/analyze/
└── page.tsx                  # Replace username input with PlatformGrid + 2-step flow

src/components/
├── PlatformGrid.tsx           # 6-card grid (PlatformCard per platform)
└── PlatformCard.tsx           # Single card: icon, name, health badge, click handler

vercel.json                   # Add cron job for health canary

src/app/api/cron/
└── platform-health/route.ts  # GET: runs canary scrapes, writes to Supabase
```

### Pattern 1: Unified NormalizedProfile (Discriminated Union)

**What:** A `type NormalizedProfile` that is a discriminated union where the `platform` field is the discriminant. All variants share a common base with fields the AI prompt and enrichment pipeline always need. Platform-specific extras are in the union variant.

**Why this over per-platform types:** The `/api/analyze` route currently receives `profileData` and passes it directly to `analyzeWithApi`. If NormalizedProfile becomes a union, the route needs zero changes. The `buildAnalysisPrompt` function receives the full profile including platform — it can switch on `platform` to customize the prompt without needing separate call paths.

**When to use:** All scrapers return `ScraperResult` with `profile: NormalizedProfile`.

**Example:**
```typescript
// src/lib/scrapers/types.ts

export interface BaseProfile {
  platform: string;       // discriminant
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;     // videos for YouTube/TikTok, tweets for Twitter
  isVerified: boolean;
  profilePicUrl: string;
  externalUrl?: string;
  recentPosts?: RecentPost[];  // reused; caption used for NLP
}

export interface YouTubeProfile extends BaseProfile {
  platform: "youtube";
  subscriberCountText: string;  // "2.75M subscribers" — for display
  viewCount: number;
  channelId: string;
}

export interface TwitterProfile extends BaseProfile {
  platform: "twitter";
  tweetsCount: number;         // statuses_count
  likesCount: number;          // favourites_count
  isBlueVerified: boolean;
}

export interface TikTokProfile extends BaseProfile {
  platform: "tiktok";
  heartCount: number;          // total likes received
  videoCount: number;
}

export interface LinkedInProfile extends BaseProfile {
  platform: "linkedin";
  connectionsCount: number;
  experience?: LinkedInExperience[];
}

export interface FacebookProfile extends BaseProfile {
  platform: "facebook";
  likeCount: number;
  category?: string;
}

export type NormalizedProfile =
  | InstagramProfile          // existing (with platform: "instagram" added)
  | YouTubeProfile
  | TwitterProfile
  | TikTokProfile
  | LinkedInProfile
  | FacebookProfile;
```

**Migration note:** `InstagramProfile` in `src/lib/types.ts` needs a `platform: "instagram"` field added. This is a small additive change — the existing cascade sets it when mapping.

### Pattern 2: ScrapeCreators Scraper (for Twitter, TikTok, LinkedIn, Facebook)

**What:** Each ScrapeCreators-backed scraper follows the same pattern: validate env var, call API with 15s timeout, parse with Zod schema, map to NormalizedProfile. No internal cascade for ScrapeCreators — per D-06/D-07, failure goes directly to error + retry (no manual entry fallback).

```typescript
// src/lib/scrapers/twitter/index.ts
import type { PlatformScraper, ScraperResult } from "@/lib/scrapers/types";
import { scrapeTwitterProfile } from "./client";

export class TwitterScraper implements PlatformScraper {
  readonly platform = "twitter" as const;

  async scrape(username: string): Promise<ScraperResult> {
    const result = await scrapeTwitterProfile(username);
    return result;
  }
}
```

```typescript
// src/lib/scrapers/twitter/client.ts
import { z } from "zod";
import type { ScraperResult, TwitterProfile } from "@/lib/scrapers/types";

const TwitterApiSchema = z.object({
  screen_name: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  followers_count: z.number().optional(),
  friends_count: z.number().optional(),
  statuses_count: z.number().optional(),
  favourites_count: z.number().optional(),
  verified: z.boolean().optional(),
  is_blue_verified: z.boolean().optional(),
  profile_image_url_https: z.string().optional(),
});

export async function scrapeTwitterProfile(handle: string): Promise<ScraperResult> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SCRAPECREATORS_API_KEY not configured" };
  }

  const cleanHandle = handle.replace(/^@/, "").trim();

  try {
    const res = await fetch(
      `https://api.scrapecreators.com/v1/twitter/profile?handle=${encodeURIComponent(cleanHandle)}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      return { success: false, error: `API error: ${res.status}` };
    }

    const raw = await res.json();
    const parsed = TwitterApiSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Unexpected API response shape" };
    }

    const data = parsed.data;
    const profile: TwitterProfile = {
      platform: "twitter",
      username: data.screen_name ?? cleanHandle,
      fullName: data.name ?? cleanHandle,
      biography: data.description ?? "",
      followersCount: data.followers_count ?? 0,
      followingCount: data.friends_count ?? 0,
      postsCount: data.statuses_count ?? 0,
      isVerified: data.verified ?? false,
      isBlueVerified: data.is_blue_verified ?? false,
      profilePicUrl: data.profile_image_url_https ?? "",
      tweetsCount: data.statuses_count ?? 0,
      likesCount: data.favourites_count ?? 0,
    };

    return { success: true, profile };
  } catch {
    return { success: false, error: "Network error fetching Twitter profile" };
  }
}
```

### Pattern 3: YouTube Scraper (Official API)

**What:** Use `googleapis` with API key (no OAuth needed for public channel data). Look up by handle using `channels.list` with `forHandle` filter. Cost: 1 unit per call (10K/day free).

```typescript
// src/lib/scrapers/youtube/client.ts
import { google } from "googleapis";
import type { ScraperResult, YouTubeProfile } from "@/lib/scrapers/types";

const youtube = google.youtube("v3");

export async function scrapeYouTubeChannel(handle: string): Promise<ScraperResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "YOUTUBE_API_KEY not configured" };
  }

  const cleanHandle = handle.replace(/^@/, "").trim();

  try {
    const response = await youtube.channels.list({
      key: apiKey,
      part: ["snippet", "statistics"],
      forHandle: cleanHandle,
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    const stats = channel.statistics ?? {};
    const snippet = channel.snippet ?? {};

    const profile: YouTubeProfile = {
      platform: "youtube",
      username: snippet.customUrl ?? cleanHandle,
      fullName: snippet.title ?? cleanHandle,
      biography: snippet.description ?? "",
      followersCount: parseInt(stats.subscriberCount ?? "0", 10),
      followingCount: 0,  // YouTube doesn't expose following
      postsCount: parseInt(stats.videoCount ?? "0", 10),
      isVerified: false,  // not in API response
      profilePicUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? "",
      externalUrl: undefined,
      channelId: channel.id ?? "",
      subscriberCountText: stats.subscriberCount
        ? `${Number(stats.subscriberCount).toLocaleString()} subscribers`
        : "0 subscribers",
      viewCount: parseInt(stats.viewCount ?? "0", 10),
    };

    return { success: true, profile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "YouTube API error",
    };
  }
}
```

**Fallback for YouTube:** If `YOUTUBE_API_KEY` quota is exhausted (403 with `quotaExceeded`), fall back to ScrapeCreators `/v1/youtube/channel`. The cascade for YouTube should be: official API → ScrapeCreators → error.

### Pattern 4: LinkedIn Handle Normalization

**What:** LinkedIn's ScrapeCreators endpoint takes a full URL, not a handle. The analyze page must accept either a handle or a URL for LinkedIn. The scraper normalizes input to a URL before calling the API.

```typescript
function normalizeLinkedInInput(input: string): string {
  if (input.startsWith("https://")) return input;
  const clean = input.replace(/^@/, "").trim();
  // Accept "username" or "/in/username" — normalize to full URL
  if (clean.startsWith("/in/")) {
    return `https://www.linkedin.com${clean}`;
  }
  return `https://www.linkedin.com/in/${clean}/`;
}
```

**Same applies to Facebook:** `facebook.com/pagename` or just `pagename` → full URL.

### Pattern 5: Per-Platform AI Prompt Building

**What:** `buildAnalysisPrompt` in `src/lib/prompt.ts` currently hardcodes "You are an expert Instagram growth strategist." It must be extended to accept `platform` and return a platform-appropriate system prompt with platform-specific JSON schema fields.

**Approach:** Export a `buildPlatformPrompt(profile: NormalizedProfile, nlp, trend)` that switches on `profile.platform`. Each branch returns a full prompt string. The JSON response schema in the prompt varies by platform (YouTube has no hashtags section; LinkedIn has no content calendar; TikTok has trending sounds).

```typescript
// src/lib/prompt.ts — add platform switch

export function buildAnalysisPrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const platform = "platform" in profileData ? profileData.platform : "instagram";

  switch (platform) {
    case "youtube":   return buildYouTubePrompt(profileData, nlpResult, trendResult);
    case "twitter":   return buildTwitterPrompt(profileData, nlpResult, trendResult);
    case "tiktok":    return buildTikTokPrompt(profileData, nlpResult, trendResult);
    case "linkedin":  return buildLinkedInPrompt(profileData, nlpResult, trendResult);
    case "facebook":  return buildFacebookPrompt(profileData, nlpResult, trendResult);
    default:          return buildInstagramPrompt(profileData, nlpResult, trendResult);
  }
}
```

**Per-platform prompt focus (D-10):**

| Platform | Expert Role | Key Sections | Notable Differences |
|----------|------------|--------------|-------------------|
| YouTube | Video growth strategist | Video cadence, thumbnail strategy, SEO titles, Shorts vs long-form, monetization milestones | No hashtags; add "videoSEO" and "thumbnailStrategy" sections |
| Twitter/X | Thread & engagement strategist | Thread structure, reply engagement, timing, quote-tweet strategy | No content calendar; add "threadStrategy" section |
| TikTok | Viral content & trending strategist | Sound selection, trending challenges, duet/stitch tactics, For You Page signals | Add "trendingAngles" section; hashtags remain but trend-focused |
| LinkedIn | Professional brand strategist | Thought leadership, post types (text vs docs vs polls), connection growth, employer brand | No hashtags; add "thoughtLeadership" and "connectionStrategy" sections |
| Facebook | Community & page growth strategist | Group vs page strategy, paid promotion awareness, Facebook Reels, community engagement | Add "communityEngagement" section; hashtags minimal |
| Instagram | (existing) | (unchanged) | (unchanged) |

### Pattern 6: Platform Card Grid (2-Step Analyze Flow)

**What:** Replace the single-step username input on `/analyze/page.tsx` with a 2-step flow:
1. Step 1: Platform grid — user selects platform
2. Step 2: Username/handle input scoped to selected platform

**State machine extension:**

```typescript
// Existing: "input" | "loading" | "manual" | "results" | "error"
// New:      "platform" | "input" | "loading" | "results" | "error"
// Note: "manual" state stays for Instagram only. New platforms use "error" state.

type AnalyzeState = "platform" | "input" | "loading" | "results" | "error";
```

**localStorage persistence (D-02):**

```typescript
const LAST_PLATFORM_KEY = "instaanalyse_last_platform";

// On mount: read from localStorage
const [platform, setPlatform] = useState<string>(() => {
  if (typeof window === "undefined") return "instagram";
  return localStorage.getItem(LAST_PLATFORM_KEY) ?? "instagram";
});

// On select: write to localStorage
function handlePlatformSelect(p: string) {
  setPlatform(p);
  localStorage.setItem(LAST_PLATFORM_KEY, p);
  setState("input");
}
```

**Grid layout (D-03, specifics from CONTEXT.md):**
- 2 cols mobile, 3 cols tablet, 6 cols desktop
- `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6`
- Cards: platform icon + name + health badge
- Dark aesthetic consistent with existing `bg-[#0a0a0f]`

### Pattern 7: Platform Health Check

**What:** A Vercel Cron job runs canary checks for all 6 platforms every 15 minutes, writing status to Supabase. A lightweight GET endpoint returns the current status map. The `/analyze` page fetches platform health on mount to display on cards.

**Vercel Cron configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/platform-health",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Supabase table:**
```sql
CREATE TABLE public.platform_health (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null unique,
  status      text not null,  -- 'ok' | 'degraded' | 'down'
  checked_at  timestamptz not null default now(),
  error_msg   text
);
```

**Security:** Cron route validates `Authorization: Bearer ${CRON_SECRET}` header. Vercel sends this automatically when `CRON_SECRET` env var is set. The canary uses a known-public test handle per platform (e.g., "google" for YouTube, "x" for Twitter).

**Client-side health fetch:** The `/analyze` page fetches `GET /api/platform-health` on mount. This endpoint reads the `platform_health` table (no auth required — status data is non-sensitive) and returns a `Record<string, "ok" | "degraded" | "down">`.

### Anti-Patterns to Avoid

- **Requiring OAuth for YouTube:** The `channels.list` endpoint with API key covers all public channel data. OAuth is only needed for the user's own private data. Never use OAuth here.
- **Using `forUsername` for YouTube:** The `forUsername` filter is for legacy YouTube usernames (pre-handle era). New channels use `forHandle`. Accept both: try `forHandle` first, then `forUsername` as internal fallback.
- **Hardcoding ScrapeCreators base URL:** Extract to a constant `SCRAPECREATORS_BASE = "https://api.scrapecreators.com"` — the domain should be easy to update if the provider changes.
- **Passing full LinkedIn URL in the analyze page URL:** The LinkedIn input field should accept both handle and URL (the scraper normalizes internally). Don't force users to enter a full URL.
- **Rendering platform health as blocking:** If the health check fetch fails (network error, Supabase down), default all platforms to "ok" — don't block users from attempting analysis.
- **Calling ScrapeCreators for every canary check tick:** Canary checks consume credits. Use known stable test handles, and throttle to one check per platform per 15-minute window. Consider checking only the "most recently failing" platform more frequently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YouTube channel data | Custom scraper / HTML parsing | googleapis channels.list with API key | Official, free 10K/day, no ToS risk, handles CDN/redirect complexity |
| API response validation | Custom type guards | Zod `.safeParse()` on every API response | Platform APIs change without notice; Zod catches structural changes gracefully |
| Twitter/TikTok/LinkedIn/Facebook scraping | Puppeteer + stealth plugins | ScrapeCreators API | Maintaining headless browser scrapers for 5 platforms is operationally unsustainable |
| Cron scheduling | Custom timer or worker | Vercel Cron (vercel.json) | Native to Vercel deployment — no additional service needed |
| Platform icon SVGs | Custom icons | lucide-react (already installed) or platform brand SVGs | lucide-react v0.511.0 is already in package.json |

**Key insight:** Third-party scraping APIs exist specifically to absorb the maintenance cost of platform anti-bot changes. The economics only make sense if you don't also maintain your own scrapers alongside them.

---

## Common Pitfalls

### Pitfall 1: ScrapeCreators LinkedIn Requires URL, Not Handle

**What goes wrong:** Calling `/v1/linkedin/profile?handle=johndoe` — the endpoint requires a full LinkedIn profile URL, not a username.

**Why it happens:** LinkedIn's public profile structure uses `/in/username` paths; the scraper wraps the URL lookup.

**How to avoid:** The LinkedIn scraper's `scrape(username)` method normalizes input to a full URL using `normalizeLinkedInInput()` before calling the API. The analyze page placeholder text should hint "LinkedIn URL or username."

**Warning signs:** 400 errors from ScrapeCreators LinkedIn endpoint.

### Pitfall 2: YouTube forHandle vs forUsername

**What goes wrong:** Many older code examples use `forUsername`. Post-2021 YouTube handles (the `@handle` system) only work with `forHandle`. Using `forUsername` returns no results for most modern channels.

**Why it happens:** The `forUsername` filter predates the YouTube handle system.

**How to avoid:** Always try `forHandle` first. If zero items returned, retry with `forUsername` as a fallback for legacy channel names. Accept `@` prefix in input and strip it before passing to `forHandle`.

**Warning signs:** Empty `items` array from channels.list with `forUsername` on modern channels.

### Pitfall 3: NormalizedProfile Union Breaking the Analyze Route

**What goes wrong:** Switching `NormalizedProfile` from `= InstagramProfile` to a union type causes TypeScript errors in `route.ts` where `profileData` is typed as `InstagramProfile | ManualProfileInput`.

**Why it happens:** `route.ts` line 63 declares `let profileData: InstagramProfile | ManualProfileInput | undefined` — this type must be updated.

**How to avoid:** Update `route.ts` to `let profileData: NormalizedProfile | ManualProfileInput | undefined`. The rest of the route doesn't inspect platform-specific fields — it passes `profileData` to `analyzeWithApi` which passes it to `buildAnalysisPrompt`. The prompt builder handles platform-switching internally.

**Warning signs:** TypeScript error "Type 'TwitterProfile' is not assignable to type 'InstagramProfile'" on `profileData` assignment.

### Pitfall 4: InstagramProfile Missing `platform` Discriminant

**What goes wrong:** Adding `platform` to the union requires `InstagramProfile` to have `platform: "instagram"`. The existing `InstagramProfile` interface in `src/lib/types.ts` doesn't have this field. All existing Instagram cascade returns will need the field added to their mapper output.

**Why it happens:** Phase 1 built `InstagramProfile` without the discriminant because it was the only platform.

**How to avoid:** Add `platform: "instagram"` to the `InstagramProfile` interface and to the return objects in `scraper-rapidapi.ts`, `instagram.ts`, etc. This is a mechanical change — use TypeScript compiler errors to find all affected sites.

**Warning signs:** TypeScript union narrowing doesn't work because `platform` field is absent from `InstagramProfile`.

### Pitfall 5: ScrapeCreators Credit Exhaustion Silently Fails

**What goes wrong:** ScrapeCreators returns HTTP 402 with `{ success: false, error: "Insufficient credits" }` when credits are depleted. If Zod validation expects a profile shape, the parse fails and the error message "Unexpected API response shape" masks the real issue.

**Why it happens:** Credit exhaustion is a business-layer error, not a data error. It returns a different response shape.

**How to avoid:** Before Zod-parsing the profile, check for `res.status === 402` and return a specific error: `"Scraping service credits exhausted. Contact support."` Also check for `res.status === 401` to catch invalid API key separately.

**Warning signs:** All new platform scrapers simultaneously failing; credits_remaining field in response.

### Pitfall 6: LinkedIn and Facebook Reliability

**What goes wrong:** LinkedIn actively blocks scrapers. Even with ScrapeCreators as the provider, LinkedIn requests fail at a higher rate than other platforms (~20-30% failure rate is realistic).

**Why it happens:** LinkedIn employs aggressive anti-bot measures (Cloudflare + custom detection). The `hiQ v. LinkedIn` ruling (2022) established public scraping is legal but doesn't mean technically feasible 100% of the time.

**How to avoid:** Per D-07/D-08, failure shows error + retry with no manual form. This is the correct design. The health monitor (D-03/PLAT-07) surfaces platform degradation before users commit. LinkedIn and Facebook will show "degraded" status more often than other platforms — this is expected.

**Warning signs:** LinkedIn/Facebook cards showing "degraded" in health monitor more than 20% of uptime.

### Pitfall 7: Vercel Cron on Hobby Plan Frequency Limit

**What goes wrong:** Vercel Hobby plan supports cron jobs at maximum 1 invocation per day. 15-minute canary checks require Vercel Pro.

**Why it happens:** Vercel cron job frequency is tier-gated.

**How to avoid:** If the project is on Hobby tier during development, implement health checks as on-demand (fetch on page load + cache result for 5 minutes in Supabase) rather than scheduled. Add the cron job config to `vercel.json` so it activates when Pro is provisioned. Document the tier requirement.

**Warning signs:** Cron job invocations not appearing in Vercel dashboard on Hobby plan.

---

## Code Examples

### YouTube Channel Lookup (Official API)

```typescript
// Source: googleapis npm package, YouTube Data API v3 official docs
// https://developers.google.com/youtube/v3/docs/channels/list

import { google } from "googleapis";

const youtube = google.youtube("v3");

const response = await youtube.channels.list({
  key: process.env.YOUTUBE_API_KEY,
  part: ["snippet", "statistics"],
  forHandle: "ThePatMcAfeeShow",  // strip @ prefix before passing
});

const channel = response.data.items?.[0];
// channel.statistics.subscriberCount — string (parse to int)
// channel.statistics.videoCount — string
// channel.statistics.viewCount — string
// channel.snippet.title — channel name
// channel.snippet.description — bio
// channel.snippet.thumbnails.high.url — avatar
// channel.snippet.customUrl — handle (e.g., "@thepatmcafeeshow")
```

### ScrapeCreators API Call Pattern

```typescript
// Source: docs.scrapecreators.com (verified 2026-03-31)

const res = await fetch(
  `https://api.scrapecreators.com/v1/twitter/profile?handle=${encodeURIComponent(handle)}`,
  {
    headers: { "x-api-key": process.env.SCRAPECREATORS_API_KEY! },
    signal: AbortSignal.timeout(15000),
  }
);

// Check for non-200 before parsing:
// 402 = credits exhausted
// 401 = invalid API key
// 400 = bad request (invalid handle)
// 500 = provider error (treat as scraper failure, not user error)
```

### Vercel Cron Route Pattern

```typescript
// src/app/api/cron/platform-health/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run canary checks for each platform...
  // Write results to platform_health Supabase table...

  return NextResponse.json({ ok: true });
}
```

### Platform Card Grid (Tailwind)

```tsx
// src/components/PlatformGrid.tsx
// 2 cols mobile, 3 cols tablet, 6 cols desktop (from CONTEXT.md specifics)
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
  {PLATFORMS.map((p) => (
    <PlatformCard
      key={p.id}
      platform={p}
      health={healthMap[p.id] ?? "ok"}
      isSelected={selectedPlatform === p.id}
      onClick={() => onSelect(p.id)}
    />
  ))}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Instagram-only scraping | Platform-agnostic registry (Phase 1) | Phase 1 | Registry pattern already in place — Phase 2 is purely additive |
| `NormalizedProfile = InstagramProfile` | Discriminated union | Phase 2 | Requires adding `platform` field to InstagramProfile; mechanical change |
| Single Instagram prompt | Per-platform prompt switch | Phase 2 | buildAnalysisPrompt gains platform switch; existing prompt moves to buildInstagramPrompt |
| No platform selector | Platform card grid + 2-step flow | Phase 2 | AnalyzeState adds "platform" state; "manual" state stays Instagram-only |
| YouTube unofficial scraping | Official YouTube Data API v3 with `forHandle` | Current (post-2022) | `forHandle` param added when YouTube introduced @handles; use this, not `forUsername` |

**Deprecated/outdated:**
- `forUsername` filter on YouTube channels.list: Works for legacy channel names but misses most modern channels. Always prefer `forHandle`.
- Official Twitter API for public profile analytics: Removed free tier in 2023, Basic is $100/month. Never viable for this product.
- Official TikTok for Developers API: Requires app review and strict data governance; doesn't expose competitor profile data. Not viable.

---

## Open Questions

1. **SCRAPECREATORS_API_KEY vs RAPIDAPI_KEY**
   - What we know: The project already has `RAPIDAPI_KEY` used for Instagram. ScrapeCreators is a separate service from RapidAPI.
   - What's unclear: Whether the user already has a ScrapeCreators account, or whether to expand RapidAPI usage to cover Twitter/TikTok via different RapidAPI providers instead.
   - Recommendation: Add `SCRAPECREATORS_API_KEY` as a new env var. If the user only wants one API key for everything, research whether ScrapeCreators is available as a RapidAPI provider — if so, the existing `RAPIDAPI_KEY` flow could be reused with a different host header. This is worth verifying in Wave 0.

2. **TikTok handle input format**
   - What we know: TikTok handles are `@username` format on the platform. ScrapeCreators `/v1/tiktok/profile?handle=stoolpresidente` (without `@`).
   - What's unclear: Whether ScrapeCreators also accepts full TikTok URLs (e.g., `https://www.tiktok.com/@stoolpresidente`).
   - Recommendation: Strip `@` prefix before API call. Document in placeholder text.

3. **YouTube quota exhaustion handling**
   - What we know: 10K units/day free. `channels.list` costs 1 unit per call.
   - What's unclear: At what user volume does 10K/day become a constraint? (10K users = ~10K analyses/day if each analyzes a YouTube channel)
   - Recommendation: Implement ScrapeCreators `/v1/youtube/channel` as fallback (per STACK.md recommendation). Add quota monitoring.

4. **Platform health Supabase table — service_role vs anon key**
   - What we know: The cron job writes to `platform_health`; the public GET endpoint reads it.
   - What's unclear: Reading platform health requires no auth (it's public data) but reading from Supabase requires a key.
   - Recommendation: Use `supabase.from("platform_health").select()` with the anon key and no RLS (or an "allow all reads" policy) for the health endpoint. The cron job uses service_role for writes.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scrapers | ✓ | system | — |
| npm | Package install | ✓ | system | — |
| googleapis (npm) | PLAT-01 YouTube | ✗ (not yet installed) | — | Install: `npm install googleapis` |
| YOUTUBE_API_KEY | PLAT-01 | ✗ (not in env) | — | Must be configured in .env.local + Vercel |
| SCRAPECREATORS_API_KEY | PLAT-02..05 | ✗ (not in env) | — | Must be configured; or verify if RAPIDAPI_KEY can cover these via RapidAPI-hosted ScrapeCreators |
| RAPIDAPI_KEY | Instagram (existing), potential Twitter/TikTok fallback | ✓ (assumed from Phase 1) | — | Already in use |
| Vercel Cron (Pro tier) | PLAT-07 health monitoring at 15min | Unknown — depends on plan | — | On Hobby: use on-demand health check instead |
| CRON_SECRET env var | Cron route security | ✗ (not documented) | — | Must add to .env.local + Vercel |

**Missing dependencies with no fallback:**
- `YOUTUBE_API_KEY` — must be obtained from Google Cloud Console before YouTube scraping can work
- `SCRAPECREATORS_API_KEY` — must be obtained from app.scrapecreators.com before new platform scrapers work

**Missing dependencies with fallback:**
- `googleapis` npm package — install in Wave 0; YouTube scraper can also use ScrapeCreators `/v1/youtube/channel` if googleapis install is delayed
- Vercel Cron on Pro — on Hobby plan, implement health checks as on-demand with 5-minute Supabase cache instead

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (present with `passWithNoTests: true`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAT-01 | YouTube scraper maps API response to NormalizedProfile correctly | unit | `npx vitest run src/lib/scrapers/youtube` | ❌ Wave 0 |
| PLAT-02 | Twitter scraper maps ScrapeCreators response correctly | unit | `npx vitest run src/lib/scrapers/twitter` | ❌ Wave 0 |
| PLAT-03 | TikTok scraper maps ScrapeCreators response correctly | unit | `npx vitest run src/lib/scrapers/tiktok` | ❌ Wave 0 |
| PLAT-04 | LinkedIn scraper maps ScrapeCreators response correctly | unit | `npx vitest run src/lib/scrapers/linkedin` | ❌ Wave 0 |
| PLAT-05 | Facebook scraper maps ScrapeCreators response correctly | unit | `npx vitest run src/lib/scrapers/facebook` | ❌ Wave 0 |
| PLAT-06 | All platforms return NormalizedProfile with required base fields | unit | `npx vitest run src/lib/scrapers` | ❌ Wave 0 |
| PLAT-07 | Platform health endpoint returns correct status shape | unit | `npx vitest run src/app/api/platform-health` | ❌ Wave 0 |
| PLAT-02 | LinkedIn input normalization converts handle to full URL | unit | `npx vitest run src/lib/scrapers/linkedin` | ❌ Wave 0 |
| D-10 | buildAnalysisPrompt returns platform-specific expert role | unit | `npx vitest run src/lib/prompt` | ❌ Wave 0 |

**Key test strategy:** All scraper unit tests should mock the external API call (fetch mock or vitest `vi.fn()`) and test the mapper function with known fixture data. This avoids real API calls in CI and validates the Zod parsing + mapping logic independently.

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/scrapers`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/scrapers/youtube/__tests__/mapper.test.ts` — covers PLAT-01
- [ ] `src/lib/scrapers/twitter/__tests__/mapper.test.ts` — covers PLAT-02
- [ ] `src/lib/scrapers/tiktok/__tests__/mapper.test.ts` — covers PLAT-03
- [ ] `src/lib/scrapers/linkedin/__tests__/mapper.test.ts` — covers PLAT-04 + handle normalization
- [ ] `src/lib/scrapers/facebook/__tests__/mapper.test.ts` — covers PLAT-05
- [ ] `src/lib/__tests__/prompt.test.ts` — covers D-10 platform prompt switching
- [ ] `src/lib/scrapers/__tests__/registry.test.ts` — validates all 6 platforms registered

---

## Sources

### Primary (HIGH confidence)

- `docs.scrapecreators.com` — ScrapeCreators API endpoints, response fields for Twitter, TikTok, LinkedIn, Facebook, YouTube (fetched live 2026-03-31)
- `developers.google.com/youtube/v3/docs/channels/list` — YouTube channels.list parameters, quota cost, forHandle filter (fetched live 2026-03-31)
- `vercel.com/docs/cron-jobs` — Vercel cron job configuration, vercel.json format, CRON_SECRET pattern (fetched live 2026-03-31)
- `npm view googleapis version` — confirmed 171.4.0 current (live check 2026-03-31)
- `npm view zod version` — confirmed 4.3.6 installed (live check 2026-03-31)

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — project-level API provider recommendations (ScrapeCreators, YouTube official) — MEDIUM (authored 2026-03-31, pre-validated by prior research)
- `.planning/research/ARCHITECTURE.md` — platform adapter pattern, registry approach — HIGH (authored 2026-03-31)
- `.planning/research/PITFALLS.md` — LinkedIn/Facebook scraping reliability concerns, canary monitor pattern — HIGH (authored 2026-03-31)
- `developers.google.com/youtube/v3/quickstart/nodejs` — googleapis authentication pattern (API key vs OAuth) — HIGH

### Tertiary (LOW confidence)

- WebSearch results on ScrapeCreators pricing / credit model — LOW (vendor marketing, not independently verified)
- WebSearch on Vercel Cron Pro tier frequency limits — LOW (inferred from search snippets; recommend verifying at vercel.com/docs/cron-jobs/usage-and-pricing before assuming 15-minute frequency requires Pro)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — googleapis version verified via npm registry; ScrapeCreators endpoints verified via live doc fetch
- Architecture: HIGH — builds directly on existing Phase 1 patterns (PlatformScraper, registry, cascade); no novel architectural decisions
- Type strategy: MEDIUM-HIGH — discriminated union recommendation is well-established TypeScript pattern; the specific migration impact (adding `platform` to InstagramProfile) is LOW risk but requires careful execution
- Per-platform prompts: MEDIUM — prompt content is subjective; the switching mechanism is HIGH confidence, the prompt text itself requires iteration
- Platform health / cron: MEDIUM — Vercel cron pattern is HIGH confidence; the Pro plan frequency limit caveat is LOW confidence (requires verification)
- LinkedIn/Facebook reliability: LOW-MEDIUM — third-party scraping reliability is inherently uncertain; test in production before claiming stable

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (ScrapeCreators API shape may change; YouTube API parameters are stable)
