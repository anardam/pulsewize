// src/lib/scrapers/youtube/client.ts
// Primary: YouTube Data API v3 via direct HTTP (no googleapis package required).
// Fallback: ScrapeCreators /v1/youtube/channel on quota exhaustion.
import { z } from "zod";
import type { ScraperResult, YouTubeProfile } from "@/lib/scrapers/types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

const YouTubeChannelItemSchema = z.object({
  id: z.string().optional(),
  snippet: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      customUrl: z.string().optional(),
      thumbnails: z
        .object({
          high: z.object({ url: z.string().optional() }).optional(),
          default: z.object({ url: z.string().optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
  statistics: z
    .object({
      subscriberCount: z.string().optional(),
      videoCount: z.string().optional(),
      viewCount: z.string().optional(),
      hiddenSubscriberCount: z.boolean().optional(),
    })
    .optional(),
});

const YouTubeChannelResponseSchema = z.object({
  items: z.array(YouTubeChannelItemSchema).optional(),
  error: z
    .object({
      code: z.number().optional(),
      errors: z
        .array(z.object({ reason: z.string().optional() }))
        .optional(),
    })
    .optional(),
});

const ScrapeCreatorsYouTubeSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  customUrl: z.string().optional(),
  subscriberCount: z.union([z.string(), z.number()]).optional(),
  videoCount: z.union([z.string(), z.number()]).optional(),
  viewCount: z.union([z.string(), z.number()]).optional(),
  thumbnail: z.string().optional(),
});

function decodeYouTubeText(value: string): string {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\u0027/g, "'")
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

function parseCountFromText(value: string | undefined): number {
  if (!value) return 0;

  const match = value.match(/([\d.,]+)\s*([KMB])?/i);
  if (!match) return 0;

  const base = Number.parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(base)) return 0;

  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") return Math.round(base * 1_000);
  if (suffix === "M") return Math.round(base * 1_000_000);
  if (suffix === "B") return Math.round(base * 1_000_000_000);
  return Math.round(base);
}

function matchFirst(text: string, pattern: RegExp): string | undefined {
  return pattern.exec(text)?.[1];
}

function mapChannelToProfile(
  channel: z.infer<typeof YouTubeChannelItemSchema>,
  cleanHandle: string
): YouTubeProfile {
  const snippet = channel.snippet ?? {};
  const stats = channel.statistics ?? {};

  return {
    platform: "youtube",
    username: snippet.customUrl ?? cleanHandle,
    fullName: snippet.title ?? cleanHandle,
    biography: snippet.description ?? "",
    followersCount: parseInt(stats.subscriberCount ?? "0", 10),
    followingCount: 0,
    postsCount: parseInt(stats.videoCount ?? "0", 10),
    isVerified: false,
    profilePicUrl:
      snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? "",
    channelId: channel.id ?? "",
    subscriberCountText: stats.subscriberCount
      ? `${Number(stats.subscriberCount).toLocaleString()} subscribers`
      : "0 subscribers",
    viewCount: parseInt(stats.viewCount ?? "0", 10),
  };
}

async function scrapeYouTubeChannelPrimary(
  handle: string
): Promise<ScraperResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "YOUTUBE_API_KEY not configured" };
  }

  const cleanHandle = handle.replace(/^@/, "").trim();

  try {
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("forHandle", cleanHandle);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000),
    });

    const raw: unknown = await res.json();
    const parsed = YouTubeChannelResponseSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: "Unexpected YouTube API response shape" };
    }

    const data = parsed.data;

    // Surface quota exhaustion as sentinel so cascade can branch
    if (!res.ok) {
      const reason = data.error?.errors?.[0]?.reason ?? "";
      if (res.status === 403 || reason.includes("quotaExceeded")) {
        return { success: false, error: "QUOTA_EXCEEDED" };
      }
      return { success: false, error: `YouTube API error: ${res.status}` };
    }

    let items = data.items ?? [];

    // Legacy handle fallback: try forUsername if forHandle returned nothing
    if (items.length === 0) {
      const legacyUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
      legacyUrl.searchParams.set("key", apiKey);
      legacyUrl.searchParams.set("part", "snippet,statistics");
      legacyUrl.searchParams.set("forUsername", cleanHandle);

      const legacyRes = await fetch(legacyUrl.toString(), {
        signal: AbortSignal.timeout(15000),
      });
      const legacyRaw: unknown = await legacyRes.json();
      const legacyParsed = YouTubeChannelResponseSchema.safeParse(legacyRaw);

      if (legacyParsed.success) {
        items = legacyParsed.data.items ?? [];
      }
    }

    if (items.length === 0) {
      return { success: false, error: "Channel not found" };
    }

    const profile = mapChannelToProfile(items[0], cleanHandle);
    return { success: true, profile };
  } catch {
    return { success: false, error: "Network error fetching YouTube channel" };
  }
}

async function scrapeYouTubeChannelFallback(
  handle: string
): Promise<ScraperResult> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SCRAPECREATORS_API_KEY not configured" };
  }

  const cleanHandle = handle.replace(/^@/, "").trim();

  try {
    const res = await fetch(
      `${SCRAPECREATORS_BASE}/v1/youtube/channel?handle=${encodeURIComponent(cleanHandle)}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      return {
        success: false,
        error: `ScrapeCreators YouTube error: ${res.status}`,
      };
    }

    const raw: unknown = await res.json();
    const parsed = ScrapeCreatorsYouTubeSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Unexpected ScrapeCreators YouTube response shape",
      };
    }

    const data = parsed.data;
    const subCount = String(data.subscriberCount ?? "0");
    const profile: YouTubeProfile = {
      platform: "youtube",
      username: data.customUrl ?? cleanHandle,
      fullName: data.title ?? cleanHandle,
      biography: data.description ?? "",
      followersCount: parseInt(subCount, 10),
      followingCount: 0,
      postsCount: parseInt(String(data.videoCount ?? "0"), 10),
      isVerified: false,
      profilePicUrl: data.thumbnail ?? "",
      channelId: data.id ?? "",
      subscriberCountText: subCount
        ? `${Number(subCount).toLocaleString()} subscribers`
        : "0 subscribers",
      viewCount: parseInt(String(data.viewCount ?? "0"), 10),
    };

    return { success: true, profile };
  } catch {
    return {
      success: false,
      error: "Network error fetching YouTube channel from fallback",
    };
  }
}

async function scrapeYouTubeChannelWebFallback(handle: string): Promise<ScraperResult> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  const candidateUrls = [
    `https://www.youtube.com/@${encodeURIComponent(cleanHandle)}`,
    `https://www.youtube.com/c/${encodeURIComponent(cleanHandle)}`,
    `https://www.youtube.com/user/${encodeURIComponent(cleanHandle)}`,
  ];

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await fetch(candidateUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      if (!html.includes("channelMetadataRenderer") && !html.includes("<title>")) {
        continue;
      }

      const title = decodeYouTubeText(
        matchFirst(html, /"title":"([^"]+)"/) ??
          matchFirst(html, /<meta property="og:title" content="([^"]+)"/) ??
          cleanHandle
      );
      const description = decodeYouTubeText(
        matchFirst(html, /"description":"([^"]*)"/) ??
          matchFirst(html, /<meta name="description" content="([^"]*)"/) ??
          ""
      );
      const profilePicUrl =
        matchFirst(html, /<meta property="og:image" content="([^"]+)"/) ?? "";
      const canonicalUrl =
        matchFirst(html, /<link rel="canonical" href="([^"]+)"/) ?? candidateUrl;
      const channelId =
        matchFirst(canonicalUrl, /\/channel\/([^/?"]+)/) ??
        matchFirst(html, /"externalId":"([^"]+)"/) ??
        "";
      const subscriberCountText =
        matchFirst(html, /([0-9.,KMBkmb]+ subscribers)/) ?? "0 subscribers";
      const videoCountText = matchFirst(html, /([0-9.,KMBkmb]+ videos)/) ?? "0 videos";

      const viewMatches = Array.from(
        html.matchAll(/"title":"([^"]+)".{0,220}?"viewCountText":\{"simpleText":"([^"]+)"/g)
      ).slice(0, 8);

      const recentPosts = viewMatches.map(([, videoTitle, views]) => ({
        likes: parseCountFromText(views),
        comments: 0,
        caption: decodeYouTubeText(videoTitle),
        isVideo: true,
      }));

      const profile: YouTubeProfile = {
        platform: "youtube",
        username: cleanHandle,
        fullName: title,
        biography: description,
        followersCount: parseCountFromText(subscriberCountText),
        followingCount: 0,
        postsCount: parseCountFromText(videoCountText),
        isVerified: false,
        profilePicUrl,
        channelId,
        subscriberCountText,
        viewCount: recentPosts.reduce((sum, post) => sum + post.likes, 0),
        recentPosts,
        externalUrl: canonicalUrl,
      };

      return { success: true, profile };
    } catch {
      continue;
    }
  }

  return {
    success: false,
    error: "YouTube channel not found or service unavailable",
  };
}

export async function scrapeYouTubeChannel(
  handle: string
): Promise<ScraperResult> {
  const primary = await scrapeYouTubeChannelPrimary(handle);

  if (primary.success) {
    return primary;
  }

  if (primary.error === "QUOTA_EXCEEDED") {
    const fallback = await scrapeYouTubeChannelFallback(handle);
    if (fallback.success) {
      return fallback;
    }
  }

  const webFallback = await scrapeYouTubeChannelWebFallback(handle);
  if (webFallback.success) {
    return webFallback;
  }

  return {
    success: false,
    error:
      primary.error === "YOUTUBE_API_KEY not configured"
        ? "YouTube public lookup is not configured"
        : primary.error ?? "YouTube channel not found or service unavailable",
  };
}
