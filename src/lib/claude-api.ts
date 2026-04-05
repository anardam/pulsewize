import { createOpenRouterClient } from "@/lib/ai/openrouter-client";
import { CLAUDE_SYNTHESIS_MODEL, SYNTHESIS_MAX_TOKENS } from "@/lib/ai/models";
import { buildAnalysisPrompt } from "./prompt";
import type { InstagramProfile, ManualProfileInput, AnalysisReport } from "./types";
import type { NlpResult } from "./nlp";
import type { TrendResult } from "./trends";

export async function analyzeWithApi(
  profileData: InstagramProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): Promise<{ success: boolean; report?: AnalysisReport; error?: string }> {
  const prompt = buildAnalysisPrompt(profileData, nlpResult, trendResult);

  try {
    const client = createOpenRouterClient();
    const completion = await client.chat.completions.create({
      model: CLAUDE_SYNTHESIS_MODEL,
      max_tokens: SYNTHESIS_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    if (!text) {
      return { success: false, error: "No text response from AI provider" };
    }

    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const report: AnalysisReport = JSON.parse(jsonStr);
    report.analyzedAt = new Date().toISOString();
    report.username = profileData.username;

    return { success: true, report };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("401") || message.toLowerCase().includes("authentication")) {
      return {
        success: false,
        error: "Invalid OpenRouter API key. Please check your configuration and try again.",
      };
    }
    if (message.includes("429")) {
      return {
        success: false,
        error: "Provider rate limit exceeded. Please wait a moment and try again.",
      };
    }
    if (message.includes("OPENROUTER_API_KEY not configured")) {
      return {
        success: false,
        error: "OPENROUTER_API_KEY is not configured on the server.",
      };
    }
    if (message.includes("JSON")) {
      return {
        success: false,
        error: "Failed to parse analysis results. Please try again.",
      };
    }
    return { success: false, error: `AI analysis failed: ${message}` };
  }
}
