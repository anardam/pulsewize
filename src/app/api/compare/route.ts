import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getScraper } from "@/lib/scrapers/registry";
import { buildComparePrompt } from "@/lib/prompt";
import { createOpenRouterClient } from "@/lib/ai/openrouter-client";
import { CLAUDE_SYNTHESIS_MODEL, SYNTHESIS_MAX_TOKENS } from "@/lib/ai/models";
import type { CompetitorComparisonReport } from "@/lib/types";
import type { NormalizedProfile } from "@/lib/scrapers/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { platform, usernames } = body as { platform: string; usernames: string[] };

    if (!platform || !usernames || usernames.length < 2 || usernames.length > 3) {
      return NextResponse.json(
        { success: false, error: "Provide 2-3 usernames on the same platform" },
        { status: 400 }
      );
    }

    // Re-scrape all profiles in parallel — re-scrape rather than use saved reports (research recommendation)
    const scraper = getScraper(platform);
    if (!scraper) {
      return NextResponse.json(
        { success: false, error: `Unsupported platform: ${platform}` },
        { status: 400 }
      );
    }

    const scrapeResults = await Promise.allSettled(
      usernames.map((u) => scraper.scrape(u))
    );

    const profiles: NormalizedProfile[] = scrapeResults
      .filter(
        (r): r is PromiseFulfilledResult<{ success: true; profile: NormalizedProfile }> =>
          r.status === "fulfilled" && r.value.success && !!r.value.profile
      )
      .map((r) => r.value.profile as NormalizedProfile);

    if (profiles.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not fetch at least 2 profiles. Check usernames and try again.",
        },
        { status: 422 }
      );
    }

    const prompt = buildComparePrompt(profiles, platform);
    const client = createOpenRouterClient();
    const completion = await client.chat.completions.create({
      model: CLAUDE_SYNTHESIS_MODEL,
      max_tokens: SYNTHESIS_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      return NextResponse.json(
        { success: false, error: "Failed to parse comparison report" },
        { status: 500 }
      );
    }
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    const report: CompetitorComparisonReport = JSON.parse(jsonStr);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
