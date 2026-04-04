// src/lib/scrapers/linkedin/index.ts
import type { PlatformScraper, ScraperResult } from "@/lib/scrapers/types";
import { scrapeLinkedInProfile } from "./client";

export class LinkedInScraper implements PlatformScraper {
  readonly platform = "linkedin" as const;

  async scrape(username: string): Promise<ScraperResult> {
    return scrapeLinkedInProfile(username);
  }
}
