// src/lib/scrapers/facebook/client.ts
import { z } from "zod";
import type { ScraperResult, FacebookProfile } from "@/lib/scrapers/types";

const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

function normalizeFacebookInput(input: string): string {
  if (input.startsWith("https://")) return input;
  const clean = input.replace(/^@/, "").trim();
  return `https://www.facebook.com/${clean}/`;
}

const FacebookApiSchema = z.object({
  name: z.string().optional(),
  about: z.string().optional(),
  description: z.string().optional(),
  followers: z.number().optional(),
  fan_count: z.number().optional(),
  category: z.string().optional(),
  picture: z.string().optional(),
  username: z.string().optional(),
  verification_status: z.string().optional(),
});

export async function scrapeFacebookProfile(input: string): Promise<ScraperResult> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SCRAPECREATORS_API_KEY not configured" };
  }

  const pageUrl = normalizeFacebookInput(input);

  try {
    const res = await fetch(
      `${SCRAPECREATORS_BASE}/v1/facebook/profile?url=${encodeURIComponent(pageUrl)}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      return { success: false, error: `API error: ${res.status}` };
    }

    const raw: unknown = await res.json();
    const parsed = FacebookApiSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Unexpected API response shape" };
    }

    const data = parsed.data;
    const profile: FacebookProfile = {
      platform: "facebook",
      username: data.username ?? input,
      fullName: data.name ?? input,
      biography: data.about ?? data.description ?? "",
      followersCount: data.followers ?? data.fan_count ?? 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: data.verification_status === "blue_verified",
      profilePicUrl: data.picture ?? "",
      likeCount: data.fan_count ?? data.followers ?? 0,
      category: data.category,
    };

    return { success: true, profile };
  } catch {
    return { success: false, error: "Network error fetching Facebook profile" };
  }
}
