import { describe, it, expect } from "vitest";
import { getScraper, getSupportedPlatforms } from "@/lib/scrapers/registry";

describe("getScraper", () => {
  it("returns an Instagram scraper for 'instagram'", () => {
    const scraper = getScraper("instagram");
    expect(scraper).toBeDefined();
    expect(scraper?.platform).toBe("instagram");
    expect(typeof scraper?.scrape).toBe("function");
  });

  it("returns undefined for unsupported platform 'twitter'", () => {
    const scraper = getScraper("twitter");
    expect(scraper).toBeUndefined();
  });

  it("is case-insensitive", () => {
    const scraper = getScraper("INSTAGRAM");
    expect(scraper).toBeDefined();
    expect(scraper?.platform).toBe("instagram");
  });
});

describe("getSupportedPlatforms", () => {
  it("returns ['instagram'] in Phase 1", () => {
    const platforms = getSupportedPlatforms();
    expect(platforms).toContain("instagram");
  });
});
