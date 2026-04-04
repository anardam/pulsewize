// src/lib/scrapers/types.ts
// NormalizedProfile discriminated union. Platform field is the discriminant.
// Phase 2: added YouTube, Twitter, TikTok, LinkedIn, Facebook variants.
import type { InstagramProfile, RecentPost } from "@/lib/types";

export type { InstagramProfile, RecentPost };

export interface BaseProfile {
  platform: string;
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  profilePicUrl: string;
  externalUrl?: string;
  recentPosts?: RecentPost[];
}

export interface YouTubeProfile extends BaseProfile {
  platform: "youtube";
  subscriberCountText: string;
  viewCount: number;
  channelId: string;
}

export interface TwitterProfile extends BaseProfile {
  platform: "twitter";
  tweetsCount: number;
  likesCount: number;
  isBlueVerified: boolean;
}

export interface TikTokProfile extends BaseProfile {
  platform: "tiktok";
  heartCount: number;
  videoCount: number;
}

export interface LinkedInExperience {
  title: string;
  company: string;
  duration?: string;
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
  | InstagramProfile
  | YouTubeProfile
  | TwitterProfile
  | TikTokProfile
  | LinkedInProfile
  | FacebookProfile;

export interface ScraperResult {
  success: boolean;
  profile?: NormalizedProfile;
  error?: string;
  requiresManualEntry?: boolean;
}

export interface PlatformScraper {
  readonly platform: string;
  scrape(username: string): Promise<ScraperResult>;
}
