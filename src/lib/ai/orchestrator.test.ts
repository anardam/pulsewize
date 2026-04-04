import { describe, it, expect, vi, beforeEach } from "vitest";

import { runMultiAgentAnalysis } from "@/lib/ai/orchestrator";

vi.mock("@/lib/ai/providers/claude", () => ({
  analyzeWithClaude: vi.fn(),
}));
vi.mock("@/lib/ai/providers/openai", () => ({
  analyzeWithGpt: vi.fn(),
}));
vi.mock("@/lib/ai/providers/gemini", () => ({
  analyzeWithGemini: vi.fn(),
}));

// Also mock dependencies that orchestrator uses
vi.mock("@/lib/ai/synthesizer", () => ({
  synthesizeReports: vi.fn((reports) => Promise.resolve({ success: true, report: reports[0] })),
}));
vi.mock("@/lib/prompt", () => ({
  buildAnalysisPrompt: vi.fn(() => "mock prompt"),
}));

const mockReport = {
  profileScore: { overall: 75, breakdown: { contentQuality: 70, engagement: 80, consistency: 70, growthPotential: 80, brandValue: 75 } },
  engagementStats: { rate: 3.5, avgLikes: 1200, avgComments: 45, likesToCommentsRatio: 26.7, estimatedReach: 8000 },
  strengthsWeaknesses: { strengths: ["strong engagement"], weaknesses: ["inconsistent posting"] },
  bioRewrite: "Test bio",
  contentPillars: [],
  postingStrategy: { currentFrequency: "3x/week", recommendedFrequency: "5x/week", bestTimes: [], bestFormats: [] },
  hashtags: { niche: [], midTier: [], broad: [] },
  roadmap: [],
  actionItems: [],
  quickWins: [],
  competitorInsights: [],
  contentCalendar: [],
  monetisation: { readinessScore: 50, currentTier: "nano", potentialRevenue: "$500/mo", opportunities: [], requirements: [], nextMilestone: "10K followers" },
  analyzedAt: "2026-03-31T00:00:00.000Z",
  username: "testuser",
};

describe("runMultiAgentAnalysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns synthesized report when all 3 providers succeed (AI-01)", async () => {
    const { analyzeWithClaude } = await import("@/lib/ai/providers/claude");
    const { analyzeWithGpt } = await import("@/lib/ai/providers/openai");
    const { analyzeWithGemini } = await import("@/lib/ai/providers/gemini");
    vi.mocked(analyzeWithClaude).mockResolvedValue(mockReport);
    vi.mocked(analyzeWithGpt).mockResolvedValue(mockReport);
    vi.mocked(analyzeWithGemini).mockResolvedValue(mockReport);

    const result = await runMultiAgentAnalysis({} as never, null, null);
    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report?.multiAgentMeta?.successCount).toBeGreaterThanOrEqual(1);
  });

  it("returns report when 2 of 3 providers fail (partial success — AI-01)", async () => {
    const { analyzeWithClaude } = await import("@/lib/ai/providers/claude");
    const { analyzeWithGpt } = await import("@/lib/ai/providers/openai");
    const { analyzeWithGemini } = await import("@/lib/ai/providers/gemini");
    vi.mocked(analyzeWithClaude).mockResolvedValue(mockReport);
    vi.mocked(analyzeWithGpt).mockRejectedValue(new Error("GPT failed"));
    vi.mocked(analyzeWithGemini).mockRejectedValue(new Error("Gemini failed"));

    const result = await runMultiAgentAnalysis({} as never, null, null);
    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
  });

  it("returns error when all 3 providers fail (AI-01)", async () => {
    const { analyzeWithClaude } = await import("@/lib/ai/providers/claude");
    const { analyzeWithGpt } = await import("@/lib/ai/providers/openai");
    const { analyzeWithGemini } = await import("@/lib/ai/providers/gemini");
    vi.mocked(analyzeWithClaude).mockRejectedValue(new Error("Claude failed"));
    vi.mocked(analyzeWithGpt).mockRejectedValue(new Error("GPT failed"));
    vi.mocked(analyzeWithGemini).mockRejectedValue(new Error("Gemini failed"));

    const result = await runMultiAgentAnalysis({} as never, null, null);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/all.*providers.*failed/i);
  });
});
