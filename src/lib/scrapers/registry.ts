// src/lib/scrapers/registry.ts
// Phase 2: Added YouTube, Twitter, TikTok, LinkedIn, Facebook scrapers.
import type { PlatformScraper } from "./types";
import { InstagramScraper } from "./instagram";
import { YouTubeScraper } from "./youtube";
import { TwitterScraper } from "./twitter";
import { TikTokScraper } from "./tiktok";
import { LinkedInScraper } from "./linkedin";
import { FacebookScraper } from "./facebook";

const registry = new Map<string, PlatformScraper>([
  ["instagram", new InstagramScraper()],
  ["youtube", new YouTubeScraper()],
  ["twitter", new TwitterScraper()],
  ["tiktok", new TikTokScraper()],
  ["linkedin", new LinkedInScraper()],
  ["facebook", new FacebookScraper()],
]);

export function getScraper(platform: string): PlatformScraper | undefined {
  return registry.get(platform.toLowerCase());
}

export function getSupportedPlatforms(): string[] {
  return Array.from(registry.keys());
}
