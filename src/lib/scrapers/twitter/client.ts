// src/lib/scrapers/twitter/client.ts
import { z } from "zod";
import type { ScraperResult, TwitterProfile } from "@/lib/scrapers/types";

const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

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
      `${SCRAPECREATORS_BASE}/v1/twitter/profile?handle=${encodeURIComponent(cleanHandle)}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      return { success: false, error: `API error: ${res.status}` };
    }

    const raw: unknown = await res.json();
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
