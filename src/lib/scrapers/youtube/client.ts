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

export async function scrapeYouTubeChannel(
  handle: string
): Promise<ScraperResult> {
  const primary = await scrapeYouTubeChannelPrimary(handle);

  if (primary.success) {
    return primary;
  }

  if (primary.error === "QUOTA_EXCEEDED") {
    return scrapeYouTubeChannelFallback(handle);
  }

  return {
    success: false,
    error: primary.error ?? "YouTube channel not found or service unavailable",
  };
}
