// src/lib/scrapers/linkedin/client.ts
import { z } from "zod";
import type { ScraperResult, LinkedInProfile } from "@/lib/scrapers/types";

const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

function normalizeLinkedInInput(input: string): string {
  if (input.startsWith("https://")) return input;
  const clean = input.replace(/^@/, "").trim();
  if (clean.startsWith("/in/")) {
    return `https://www.linkedin.com${clean}`;
  }
  return `https://www.linkedin.com/in/${clean}/`;
}

const LinkedInApiSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  headline: z.string().optional(),
  followersCount: z.number().optional(),
  connectionsCount: z.number().optional(),
  profilePicture: z.string().optional(),
  profileImage: z.string().optional(),
  publicIdentifier: z.string().optional(),
  verified: z.boolean().optional(),
});

export async function scrapeLinkedInProfile(input: string): Promise<ScraperResult> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SCRAPECREATORS_API_KEY not configured" };
  }

  const profileUrl = normalizeLinkedInInput(input);

  try {
    const res = await fetch(
      `${SCRAPECREATORS_BASE}/v1/linkedin/profile?url=${encodeURIComponent(profileUrl)}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      return { success: false, error: `API error: ${res.status}` };
    }

    const raw: unknown = await res.json();
    const parsed = LinkedInApiSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Unexpected API response shape" };
    }

    const data = parsed.data;
    const profile: LinkedInProfile = {
      platform: "linkedin",
      username: data.publicIdentifier ?? input,
      fullName: [data.firstName, data.lastName].filter(Boolean).join(" ") || input,
      biography: data.headline ?? "",
      followersCount: data.followersCount ?? 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: data.verified ?? false,
      profilePicUrl: data.profilePicture ?? data.profileImage ?? "",
      connectionsCount: data.connectionsCount ?? 0,
    };

    return { success: true, profile };
  } catch {
    return { success: false, error: "Network error fetching LinkedIn profile" };
  }
}
