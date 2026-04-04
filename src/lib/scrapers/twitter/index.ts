// src/lib/scrapers/twitter/index.ts
import type { PlatformScraper, ScraperResult } from "@/lib/scrapers/types";
import { scrapeTwitterProfile } from "./client";

export class TwitterScraper implements PlatformScraper {
  readonly platform = "twitter" as const;

  async scrape(username: string): Promise<ScraperResult> {
    return scrapeTwitterProfile(username);
  }
}
