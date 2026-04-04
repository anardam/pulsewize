import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getScraper } from "@/lib/scrapers/registry";
import { buildHashtagPrompt } from "@/lib/prompt";
import { createOpenRouterClient } from "@/lib/ai/openrouter-client";
import { CLAUDE_SYNTHESIS_MODEL, SYNTHESIS_MAX_TOKENS } from "@/lib/ai/models";
import type { HashtagStrategyReport, ManualProfileInput } from "@/lib/types";
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
    const { platform, username, analysisReport } = body as {
      platform: string;
      username: string;
      analysisReport?: Record<string, unknown>;
    };

    if (!platform || !username) {
      return NextResponse.json(
        { success: false, error: "platform and username are required" },
        { status: 400 }
      );
    }

    let profile: NormalizedProfile | ManualProfileInput;

    if (analysisReport) {
      // Use analysisReport context as profile data — avoids re-scraping when caller already has data
      profile = {
        username,
        fullName: (analysisReport.username as string) ?? username,
        biography: "",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isVerified: false,
        ...analysisReport,
      } as ManualProfileInput;
    } else {
      // Scrape fresh profile
      const scraper = getScraper(platform);
      if (!scraper) {
        return NextResponse.json(
          { success: false, error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
      }

      const scrapeResult = await scraper.scrape(username);
      if (!scrapeResult.success || !scrapeResult.profile) {
        return NextResponse.json(
          {
            success: false,
            error: "Could not fetch profile. Check the username and try again.",
          },
          { status: 422 }
        );
      }
      profile = scrapeResult.profile;
    }

    const prompt = buildHashtagPrompt(profile, platform);
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
        { success: false, error: "Failed to parse hashtag strategy report" },
        { status: 500 }
      );
    }
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    const report: HashtagStrategyReport = JSON.parse(jsonStr);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
