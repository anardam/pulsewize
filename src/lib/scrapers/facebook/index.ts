// src/lib/scrapers/facebook/index.ts
import type { PlatformScraper, ScraperResult } from "@/lib/scrapers/types";
import { scrapeFacebookProfile } from "./client";

export class FacebookScraper implements PlatformScraper {
  readonly platform = "facebook" as const;

  async scrape(username: string): Promise<ScraperResult> {
    return scrapeFacebookProfile(username);
  }
}
