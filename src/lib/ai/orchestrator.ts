import { analyzeWithClaude } from "./providers/claude";
import { analyzeWithGpt } from "./providers/openai";
import { analyzeWithGemini } from "./providers/gemini";
import { synthesizeReports } from "./synthesizer";
import type { AnalysisReport, MultiAgentMetadata } from "@/lib/types";
import type { NormalizedProfile } from "@/lib/scrapers/types";
import type { ManualProfileInput } from "@/lib/types";
import type { NlpResult } from "@/lib/nlp";
import type { TrendResult } from "@/lib/trends";
import { buildAnalysisPrompt } from "@/lib/prompt";

export async function runMultiAgentAnalysis(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): Promise<{ success: boolean; report?: AnalysisReport; error?: string }> {
  const prompt = buildAnalysisPrompt(profileData, nlpResult, trendResult);

  // All 3 worker agents run in parallel — Promise.allSettled so one failure doesn't kill the request (AI-01)
  const [claudeResult, gptResult, geminiResult] = await Promise.allSettled([
    analyzeWithClaude(prompt),
    analyzeWithGpt(prompt),
    analyzeWithGemini(prompt),
  ]);

  const successfulReports = [claudeResult, gptResult, geminiResult]
    .filter((r): r is PromiseFulfilledResult<AnalysisReport> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);

  if (successfulReports.length === 0) {
    return { success: false, error: "All AI providers failed. Please try again." };
  }

  const providerNames = ["claude-haiku", "gpt-4o-mini", "gemini-flash"];
  const successfulProviders = [claudeResult, gptResult, geminiResult]
    .map((r, i) => ({ result: r, name: providerNames[i] }))
    .filter(({ result }) => result.status === "fulfilled" && result.value !== null)
    .map(({ name }) => name);

  const meta: MultiAgentMetadata = {
    providers: successfulProviders,
    providerCount: successfulProviders.length,
    successCount: successfulReports.length,
    synthesized: successfulReports.length > 1,
  };

  const synthesisResult = await synthesizeReports(successfulReports);

  if (!synthesisResult.success || !synthesisResult.report) {
    // Synthesis failed — return best single report (first successful)
    const fallbackReport = { ...successfulReports[0], multiAgentMeta: meta };
    return { success: true, report: fallbackReport };
  }

  const finalReport = { ...synthesisResult.report, multiAgentMeta: meta };
  return { success: true, report: finalReport };
}
