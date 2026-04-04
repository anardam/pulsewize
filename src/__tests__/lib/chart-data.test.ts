import { describe, it, expect } from "vitest";
import { buildChartData, ChartPoint } from "@/lib/chart-data";
import type { AnalysisReport } from "@/lib/types";

function makeReport(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  return {
    profileScore: { overall: 75, breakdown: { contentQuality: 70, engagement: 80, consistency: 75, growthPotential: 80, brandValue: 70 } },
    engagementStats: { rate: 4.5, avgLikes: 500, avgComments: 30, likesToCommentsRatio: 16.7, estimatedReach: 12000 },
    strengthsWeaknesses: { strengths: [], weaknesses: [] },
    bioRewrite: "",
    contentPillars: [],
    postingStrategy: { currentFrequency: "", recommendedFrequency: "", bestTimes: [], bestFormats: [] },
    hashtags: { niche: [], midTier: [], broad: [] },
    roadmap: [],
    actionItems: [],
    quickWins: [],
    competitorInsights: [],
    contentCalendar: [],
    monetisation: { readinessScore: 0, currentTier: "", potentialRevenue: "", opportunities: [], requirements: [], nextMilestone: "" },
    analyzedAt: new Date().toISOString(),
    username: "testuser",
    ...overrides,
  };
}

describe("buildChartData", () => {
  it("returns empty array when given no rows", () => {
    expect(buildChartData([])).toEqual([]);
  });

  it("returns 1 ChartPoint with correct shape for 1 report", () => {
    const rows = [
      {
        report_data: makeReport(),
        analyzed_at: "2025-01-15T10:00:00Z",
      },
    ];
    const result = buildChartData(rows);
    expect(result).toHaveLength(1);
    const point: ChartPoint = result[0];
    expect(point).toHaveProperty("date");
    expect(point).toHaveProperty("engagement");
    expect(point).toHaveProperty("score");
    expect(point).toHaveProperty("estimatedReach");
  });

  it("formats date as short date string (e.g. 'Jan 15')", () => {
    const rows = [
      {
        report_data: makeReport(),
        analyzed_at: "2025-01-15T10:00:00Z",
      },
    ];
    const result = buildChartData(rows);
    expect(result[0].date).toMatch(/Jan\s+15/);
  });

  it("extracts engagement from engagementStats.rate", () => {
    const rows = [
      {
        report_data: makeReport({ engagementStats: { rate: 3.7, avgLikes: 0, avgComments: 0, likesToCommentsRatio: 0, estimatedReach: 0 } }),
        analyzed_at: "2025-01-15T10:00:00Z",
      },
    ];
    const result = buildChartData(rows);
    expect(result[0].engagement).toBe(3.7);
  });

  it("extracts score from profileScore.overall", () => {
    const rows = [
      {
        report_data: makeReport({ profileScore: { overall: 88, breakdown: { contentQuality: 80, engagement: 90, consistency: 85, growthPotential: 90, brandValue: 85 } } }),
        analyzed_at: "2025-01-15T10:00:00Z",
      },
    ];
    const result = buildChartData(rows);
    expect(result[0].score).toBe(88);
  });

  it("extracts estimatedReach from engagementStats.estimatedReach", () => {
    const rows = [
      {
        report_data: makeReport({ engagementStats: { rate: 0, avgLikes: 0, avgComments: 0, likesToCommentsRatio: 0, estimatedReach: 50000 } }),
        analyzed_at: "2025-01-15T10:00:00Z",
      },
    ];
    const result = buildChartData(rows);
    expect(result[0].estimatedReach).toBe(50000);
  });

  it("defaults engagement to 0 when engagementStats is missing", () => {
    const report = makeReport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (report as any).engagementStats = undefined;
    const rows = [{ report_data: report, analyzed_at: "2025-01-15T10:00:00Z" }];
    const result = buildChartData(rows);
    expect(result[0].engagement).toBe(0);
  });

  it("defaults score to 0 when profileScore is missing", () => {
    const report = makeReport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (report as any).profileScore = undefined;
    const rows = [{ report_data: report, analyzed_at: "2025-01-15T10:00:00Z" }];
    const result = buildChartData(rows);
    expect(result[0].score).toBe(0);
  });

  it("defaults estimatedReach to 0 when missing", () => {
    const report = makeReport({ engagementStats: { rate: 2.0, avgLikes: 100, avgComments: 10, likesToCommentsRatio: 10, estimatedReach: 0 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (report.engagementStats as any).estimatedReach = undefined;
    const rows = [{ report_data: report, analyzed_at: "2025-01-15T10:00:00Z" }];
    const result = buildChartData(rows);
    expect(result[0].estimatedReach).toBe(0);
  });

  it("sorts 2 rows in ascending chronological order", () => {
    const rows = [
      {
        report_data: makeReport({ engagementStats: { rate: 2.0, avgLikes: 0, avgComments: 0, likesToCommentsRatio: 0, estimatedReach: 5000 } }),
        analyzed_at: "2025-02-01T10:00:00Z",
      },
      {
        report_data: makeReport({ engagementStats: { rate: 1.0, avgLikes: 0, avgComments: 0, likesToCommentsRatio: 0, estimatedReach: 2000 } }),
        analyzed_at: "2025-01-01T10:00:00Z",
      },
    ];
    const result = buildChartData(rows);
    expect(result).toHaveLength(2);
    expect(result[0].engagement).toBe(1.0);
    expect(result[1].engagement).toBe(2.0);
  });
});
