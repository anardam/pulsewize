// src/lib/scrapers/tiktok/index.ts
import type { PlatformScraper, ScraperResult } from "@/lib/scrapers/types";
import { scrapeTikTokProfile } from "./client";

export class TikTokScraper implements PlatformScraper {
  readonly platform = "tiktok" as const;

  async scrape(username: string): Promise<ScraperResult> {
    return scrapeTikTokProfile(username);
  }
}
