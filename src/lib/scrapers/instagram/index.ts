// src/lib/scrapers/instagram/index.ts
import type { PlatformScraper, ScraperResult } from "@/lib/scrapers/types";
import { runInstagramCascade } from "./cascade";

export class InstagramScraper implements PlatformScraper {
  readonly platform = "instagram" as const;

  async scrape(username: string): Promise<ScraperResult> {
    return runInstagramCascade(username);
  }
}
