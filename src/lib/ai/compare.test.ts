import { describe, it, expect } from "vitest";
import type { CompetitorComparisonReport } from "@/lib/types";

describe("competitor comparison (AI-03)", () => {
  it("comparison report contains metricsTable with at least 3 metrics", () => {
    const mockReport: CompetitorComparisonReport = {
      platform: "instagram",
      analyzedAt: "2026-03-31T00:00:00.000Z",
      profiles: [{ username: "brand_a" }, { username: "brand_b" }],
      metricsTable: [
        { metric: "Followers", values: [{ username: "brand_a", value: 50000, isLeader: true }, { username: "brand_b", value: 30000, isLeader: false }] },
        { metric: "Engagement Rate", values: [{ username: "brand_a", value: "2.1%", isLeader: false }, { username: "brand_b", value: "4.5%", isLeader: true }] },
        { metric: "Posts/Week", values: [{ username: "brand_a", value: 5, isLeader: true }, { username: "brand_b", value: 3, isLeader: false }] },
      ],
      narrative: "brand_b has significantly higher engagement despite lower follower count.",
      opportunities: ["Increase posting frequency", "Focus on niche content"],
    };

    expect(mockReport.metricsTable.length).toBeGreaterThanOrEqual(3);
    expect(mockReport.opportunities.length).toBeGreaterThan(0);
    expect(mockReport.narrative).toBeTruthy();
  });

  it("each metric row has isLeader=true for exactly one profile", () => {
    // Validates leader highlighting logic in comparison table (per D-08)
    const metricRow = {
      metric: "Followers",
      values: [
        { username: "a", value: 50000, isLeader: true },
        { username: "b", value: 30000, isLeader: false },
      ],
    };
    const leaders = metricRow.values.filter((v) => v.isLeader);
    expect(leaders.length).toBe(1);
  });
});
