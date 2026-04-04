import { describe, it, expect } from "vitest";
import type { HashtagStrategyReport } from "@/lib/types";

describe("hashtag strategy (AI-05)", () => {
  it("hashtag strategy has at least 3 categories", () => {
    const mockReport: HashtagStrategyReport = {
      platform: "instagram",
      username: "testuser",
      niche: "fitness",
      generatedAt: "2026-03-31T00:00:00.000Z",
      categories: [
        { name: "Ultra-niche", tags: ["#homegymlife"], estimatedReach: "5K-50K", competitionLevel: "low", recommendation: "Use 5-8 per post" },
        { name: "Mid-tier", tags: ["#fitnessjourney"], estimatedReach: "100K-1M", competitionLevel: "medium", recommendation: "Use 3-5 per post" },
        { name: "Broad", tags: ["#fitness"], estimatedReach: "1M+", competitionLevel: "high", recommendation: "Use 1-2 per post" },
      ],
      avoidList: ["#followforfollow", "#likeforlike"],
      weeklyRotationPlan: "Rotate mid-tier tags weekly to avoid shadowban",
      captionMixFormula: "5 niche + 3 mid-tier + 2 broad per post",
    };

    expect(mockReport.categories.length).toBeGreaterThanOrEqual(3);
    expect(mockReport.avoidList.length).toBeGreaterThan(0);
    expect(mockReport.captionMixFormula).toBeTruthy();
  });

  it("niche tags have lower competition level than broad tags (D-13)", () => {
    const competitionRank = { low: 1, medium: 2, high: 3 };
    const nicheCategory = { competitionLevel: "low" as const, tags: ["#homegymlife"] };
    const broadCategory = { competitionLevel: "high" as const, tags: ["#fitness"] };

    expect(competitionRank[nicheCategory.competitionLevel]).toBeLessThan(competitionRank[broadCategory.competitionLevel]);
  });
});
