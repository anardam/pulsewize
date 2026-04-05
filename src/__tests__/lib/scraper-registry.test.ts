import { describe, it, expect } from "vitest";
import { getScraper, getSupportedPlatforms } from "@/lib/scrapers/registry";

describe("getScraper", () => {
  it("returns an Instagram scraper for 'instagram'", () => {
    const scraper = getScraper("instagram");
    expect(scraper).toBeDefined();
    expect(scraper?.platform).toBe("instagram");
    expect(typeof scraper?.scrape).toBe("function");
  });

  it("returns a Twitter scraper for supported platform 'twitter'", () => {
    const scraper = getScraper("twitter");
    expect(scraper).toBeDefined();
    expect(scraper?.platform).toBe("twitter");
  });

  it("is case-insensitive", () => {
    const scraper = getScraper("INSTAGRAM");
    expect(scraper).toBeDefined();
    expect(scraper?.platform).toBe("instagram");
  });
});

describe("getSupportedPlatforms", () => {
  it("returns the currently registered platforms", () => {
    const platforms = getSupportedPlatforms();
    expect(platforms).toContain("instagram");
    expect(platforms).toContain("twitter");
  });
});
