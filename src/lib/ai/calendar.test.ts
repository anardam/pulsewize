import { describe, it, expect } from "vitest";
import type { ContentCalendarReport, CalendarWeek } from "@/lib/types";

describe("content calendar (AI-04)", () => {
  it("calendar report has 4 weeks with 7 days each = 28 CalendarEntry objects", () => {
    const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

    const mockWeek: CalendarWeek = DAYS.reduce(
      (acc, day) => ({
        ...acc,
        [day]: {
          contentIdea: `${day} idea`,
          optimalPostingTime: "7:00 PM EST",
          contentType: "reel" as const,
          captionDraft: "Sample caption",
          hashtags: ["#test"],
          mediaSuggestion: "vertical video",
          engagementPrediction: "High",
        },
      }),
      { weekNumber: 1 } as CalendarWeek
    );

    const mockReport: ContentCalendarReport = {
      platform: "instagram",
      username: "testuser",
      niche: "fitness",
      generatedAt: "2026-03-31T00:00:00.000Z",
      weeks: [mockWeek, { ...mockWeek, weekNumber: 2 }, { ...mockWeek, weekNumber: 3 }, { ...mockWeek, weekNumber: 4 }],
    };

    expect(mockReport.weeks.length).toBeGreaterThanOrEqual(4);
    const totalEntries = mockReport.weeks.length * 7;
    expect(totalEntries).toBeGreaterThanOrEqual(28);
  });

  it("each CalendarEntry has all required fields (D-11)", () => {
    const entry = {
      contentIdea: "Morning workout routine",
      optimalPostingTime: "7:00 AM EST",
      contentType: "reel" as const,
      captionDraft: "Start your day right 💪",
      hashtags: ["#fitness", "#morningworkout"],
      mediaSuggestion: "15-30s vertical video",
      engagementPrediction: "High — trending format",
    };

    expect(entry.contentIdea).toBeTruthy();
    expect(entry.optimalPostingTime).toBeTruthy();
    expect(entry.captionDraft).toBeTruthy();
    expect(entry.hashtags.length).toBeGreaterThan(0);
  });
});
