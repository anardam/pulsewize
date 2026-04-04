// src/lib/scrapers/tiktok/client.ts
import { z } from "zod";
import type { ScraperResult, TikTokProfile } from "@/lib/scrapers/types";

const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

const TikTokApiSchema = z.object({
  uniqueId: z.string().optional(),
  username: z.string().optional(),
  nickname: z.string().optional(),
  signature: z.string().optional(),
  followerCount: z.number().optional(),
  followingCount: z.number().optional(),
  videoCount: z.number().optional(),
  heartCount: z.number().optional(),
  heart: z.number().optional(),
  verified: z.boolean().optional(),
  avatarThumb: z.string().optional(),
});

export async function scrapeTikTokProfile(handle: string): Promise<ScraperResult> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SCRAPECREATORS_API_KEY not configured" };
  }

  const cleanHandle = handle.replace(/^@/, "").trim();

  try {
    const res = await fetch(
      `${SCRAPECREATORS_BASE}/v1/tiktok/profile?handle=${encodeURIComponent(cleanHandle)}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      return { success: false, error: `API error: ${res.status}` };
    }

    const raw: unknown = await res.json();
    const parsed = TikTokApiSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Unexpected API response shape" };
    }

    const data = parsed.data;
    const profile: TikTokProfile = {
      platform: "tiktok",
      username: data.uniqueId ?? data.username ?? cleanHandle,
      fullName: data.nickname ?? cleanHandle,
      biography: data.signature ?? "",
      followersCount: data.followerCount ?? 0,
      followingCount: data.followingCount ?? 0,
      postsCount: data.videoCount ?? 0,
      isVerified: data.verified ?? false,
      profilePicUrl: data.avatarThumb ?? "",
      heartCount: data.heartCount ?? data.heart ?? 0,
      videoCount: data.videoCount ?? 0,
    };

    return { success: true, profile };
  } catch {
    return { success: false, error: "Network error fetching TikTok profile" };
  }
}
