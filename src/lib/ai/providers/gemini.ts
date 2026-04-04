import { createOpenRouterClient } from "../openrouter-client";
import { GEMINI_FLASH_MODEL, WORKER_MAX_TOKENS } from "../models";
import type { AnalysisReport } from "@/lib/types";

function extractJson(text: string): AnalysisReport | null {
  try {
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) return null;
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    const report: AnalysisReport = JSON.parse(jsonStr);
    if (!report.profileScore || !report.engagementStats) return null;
    return report;
  } catch {
    return null;
  }
}

export async function analyzeWithGemini(prompt: string): Promise<AnalysisReport | null> {
  try {
    const client = createOpenRouterClient();
    const completion = await client.chat.completions.create({
      model: GEMINI_FLASH_MODEL,
      max_tokens: WORKER_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return extractJson(text);
  } catch {
    return null;
  }
}
