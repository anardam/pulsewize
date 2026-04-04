// src/lib/scrapers/instagram/cascade.ts
// Wraps existing scraper files in the cascade pattern.
// Reads VERCEL env var to pick the right cascade order.
import { scrapeInstagramProfile } from "@/lib/instagram";
import { scrapeWithRapidApi } from "@/lib/scraper-rapidapi";
import type { ScraperResult } from "@/lib/scrapers/types";

// Conditionally import server-only scrapers
async function tryPuppeteer(username: string): Promise<ScraperResult> {
  try {
    const { scrapeWithPuppeteer } = await import("@/lib/scraper-puppeteer");
    const result = await scrapeWithPuppeteer(username);
    return result;
  } catch {
    return { success: false, error: "Puppeteer unavailable" };
  }
}

async function tryInstaloader(username: string): Promise<ScraperResult> {
  try {
    const { scrapeWithInstaloader } = await import("@/lib/instaloader");
    const result = await scrapeWithInstaloader(username);
    return result;
  } catch {
    return { success: false, error: "Instaloader unavailable" };
  }
}

export async function runInstagramCascade(username: string): Promise<ScraperResult> {
  const isVercel = !!process.env.VERCEL;

  const scrapers: Array<() => Promise<ScraperResult>> = isVercel
    ? [
        () => scrapeWithRapidApi(username),
        () => scrapeInstagramProfile(username),
      ]
    : [
        () => tryPuppeteer(username),
        () => tryInstaloader(username),
        () => scrapeWithRapidApi(username),
        () => scrapeInstagramProfile(username),
      ];

  for (const scrape of scrapers) {
    const result = await scrape();
    if (result.success && result.profile) {
      return result;
    }
  }

  return { success: false, requiresManualEntry: true, error: "All scrapers failed" };
}
