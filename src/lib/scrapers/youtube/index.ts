// src/lib/scrapers/youtube/index.ts
import type { PlatformScraper, ScraperResult } from "@/lib/scrapers/types";
import { scrapeYouTubeChannel } from "./client";

export class YouTubeScraper implements PlatformScraper {
  readonly platform = "youtube" as const;

  async scrape(username: string): Promise<ScraperResult> {
    return scrapeYouTubeChannel(username);
  }
}
