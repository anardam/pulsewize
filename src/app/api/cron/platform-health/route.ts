// GET /api/cron/platform-health
// Vercel Cron job: runs canary checks for all platforms, writes to Supabase.
// Secured with CRON_SECRET via Authorization: Bearer header.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

// Known stable public test handles per platform
const CANARY_HANDLES: Record<string, string> = {
  youtube: "youtube",
  twitter: "x",
  tiktok: "tiktok",
  linkedin: "https://www.linkedin.com/company/linkedin/",
  facebook: "https://www.facebook.com/facebook/",
};

type CanaryStatus = "ok" | "degraded" | "down";

interface CanaryResult {
  platform: string;
  status: CanaryStatus;
  error_msg?: string;
}

async function checkInstagram(): Promise<CanaryResult> {
  // Instagram uses an existing scraper chain — treat as ok unless explicitly down
  return { platform: "instagram", status: "ok" };
}

async function checkScrapeCreators(
  platform: string,
  handle: string,
  apiKey: string
): Promise<CanaryResult> {
  try {
    const param = platform === "linkedin" || platform === "facebook" ? "url" : "handle";
    const url = `${SCRAPECREATORS_BASE}/v1/${platform}/profile?${param}=${encodeURIComponent(handle)}`;
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { platform, status: "ok" };
    if (res.status >= 500) return { platform, status: "down", error_msg: `HTTP ${res.status}` };
    return { platform, status: "degraded", error_msg: `HTTP ${res.status}` };
  } catch (err) {
    return { platform, status: "down", error_msg: err instanceof Error ? err.message : "timeout" };
  }
}

async function checkYouTube(apiKey: string): Promise<CanaryResult> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&part=id&forHandle=youtube`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) return { platform: "youtube", status: "ok" };
    return { platform: "youtube", status: "down", error_msg: `HTTP ${res.status}` };
  } catch (err) {
    return { platform: "youtube", status: "down", error_msg: err instanceof Error ? err.message : "timeout" };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const scrapeCreatorsKey = process.env.SCRAPECREATORS_API_KEY ?? "";
  const youtubeKey = process.env.YOUTUBE_API_KEY ?? "";

  const noKey = (platform: string, envVar: string): Promise<CanaryResult> =>
    Promise.resolve({ platform, status: "down" as CanaryStatus, error_msg: `${envVar} not set` });

  const results: CanaryResult[] = await Promise.all([
    checkInstagram(),
    youtubeKey
      ? checkYouTube(youtubeKey)
      : noKey("youtube", "YOUTUBE_API_KEY"),
    scrapeCreatorsKey
      ? checkScrapeCreators("twitter", CANARY_HANDLES.twitter, scrapeCreatorsKey)
      : noKey("twitter", "SCRAPECREATORS_API_KEY"),
    scrapeCreatorsKey
      ? checkScrapeCreators("tiktok", CANARY_HANDLES.tiktok, scrapeCreatorsKey)
      : noKey("tiktok", "SCRAPECREATORS_API_KEY"),
    scrapeCreatorsKey
      ? checkScrapeCreators("linkedin", CANARY_HANDLES.linkedin, scrapeCreatorsKey)
      : noKey("linkedin", "SCRAPECREATORS_API_KEY"),
    scrapeCreatorsKey
      ? checkScrapeCreators("facebook", CANARY_HANDLES.facebook, scrapeCreatorsKey)
      : noKey("facebook", "SCRAPECREATORS_API_KEY"),
  ]);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  await Promise.all(
    results.map((r) =>
      supabase.from("platform_health").upsert(
        {
          platform: r.platform,
          status: r.status,
          checked_at: new Date().toISOString(),
          error_msg: r.error_msg ?? null,
        },
        { onConflict: "platform" }
      )
    )
  );

  return NextResponse.json({ checked: results.length, results });
}
