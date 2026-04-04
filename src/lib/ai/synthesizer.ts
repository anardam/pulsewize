import { createOpenRouterClient } from "./openrouter-client";
import { CLAUDE_SYNTHESIS_MODEL, SYNTHESIS_MAX_TOKENS } from "./models";
import type { AnalysisReport } from "@/lib/types";

export async function synthesizeReports(
  reports: AnalysisReport[]
): Promise<{ success: boolean; report?: AnalysisReport; error?: string }> {
  if (reports.length === 0) {
    return { success: false, error: "No reports to synthesize" };
  }
  if (reports.length === 1) {
    // Skip synthesis — no value in synthesizing a single report
    return { success: true, report: reports[0] };
  }

  const reportsJson = reports
    .map((r, i) => `REPORT ${i + 1}:\n${JSON.stringify(r, null, 2)}`)
    .join("\n\n---\n\n");

  const synthesisPrompt = `You are a senior social media strategist synthesizing ${reports.length} independent AI analyses of the same profile.

Each analysis was produced independently by a different AI model. Your task is to produce ONE unified report that:
1. Takes the highest-quality, most specific recommendations from each analysis
2. Resolves contradictions by preferring the most data-grounded view
3. Ensures every section is fully populated (never leave arrays empty)
4. Returns valid JSON matching the EXACT AnalysisReport schema

${reportsJson}

Return ONLY the synthesized JSON object. No markdown fences. No preamble. Start with { and end with }.`;

  try {
    const client = createOpenRouterClient();
    const completion = await client.chat.completions.create({
      model: CLAUDE_SYNTHESIS_MODEL,
      max_tokens: SYNTHESIS_MAX_TOKENS,
      messages: [{ role: "user", content: synthesisPrompt }],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      return { success: false, error: "Synthesis produced invalid JSON" };
    }
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    const report: AnalysisReport = JSON.parse(jsonStr);
    if (!report.profileScore || !report.engagementStats) {
      return { success: false, error: "Synthesis report missing required fields" };
    }
    return { success: true, report };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Synthesis failed: ${message}` };
  }
}
