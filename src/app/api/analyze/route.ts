import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getScraper } from "@/lib/scrapers/registry";
import { analyzeWithApi } from "@/lib/claude-api";
import { runMultiAgentAnalysis } from "@/lib/ai/orchestrator";
import { analyzeCaption } from "@/lib/nlp";
import { getTrendDirection } from "@/lib/trends";
import { ManualProfileInput, InstagramProfile } from "@/lib/types";

export async function POST(request: NextRequest) {
  // 1. Auth check — require Supabase session
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

  // 2a. Read subscription plan to determine usage limit
  const { data: subData } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  const isPro =
    subData?.plan === "pro" &&
    (subData?.status === "active" ||
      subData?.status === "authenticated" ||
      subData?.status === "halted"); // halted: keep Pro access (payment grace period)

  const usageLimit = isPro ? 999999 : 3;

  // 2b. Check usage limit (don't increment yet — only count on success)
  if (!isPro) {
    const billingMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: usageRow } = await supabase
      .from("usage")
      .select("analyses_used")
      .eq("user_id", user.id)
      .eq("billing_month", billingMonth)
      .maybeSingle();

    const used = usageRow?.analyses_used ?? 0;
    if (used >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: "You've used all 3 free analyses this month. Upgrade to continue.",
          limitReached: true,
        },
        { status: 429 }
      );
    }
  }

  // 2c. Cache check — return fresh cached report if analyzed within last hour (AI-06, D-15)
  // Cache is per-user (RLS enforces auth.uid() = user_id) — prevents same user re-analyzing same handle
  try {
    const bodyPeek = await request.clone().json().catch(() => ({}));
    const cachedPlatform = (bodyPeek as { platform?: string }).platform ?? "instagram";
    const cachedUsername = (bodyPeek as { username?: string }).username?.toLowerCase();

    if (cachedUsername) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: cached } = await supabase
        .from("reports")
        .select("report_data")
        .eq("platform", cachedPlatform)
        .eq("username", cachedUsername)
        .eq("report_type", "analysis")
        .gt("created_at", oneHourAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.report_data) {
        return NextResponse.json({ success: true, report: cached.report_data, cached: true });
      }
    }
  } catch {
    // Cache lookup failure is non-fatal — proceed with fresh analysis
  }

  try {
    // 3. Parse request body
    const body = await request.json();
    const { username, manualData, platform = "instagram" } = body as {
      username?: string;
      manualData?: ManualProfileInput;
      platform?: string;
    };

    if (!username && !manualData) {
      return NextResponse.json(
        { success: false, error: "username or manualData is required" },
        { status: 400 }
      );
    }

    let profileData: InstagramProfile | ManualProfileInput | undefined;

    if (manualData) {
      // Manual entry bypass — skip scraping
      profileData = manualData;
    } else if (username) {
      // 4. Scraper registry (INFRA-04, D-14, D-15)
      const scraper = getScraper(platform);
      if (!scraper) {
        return NextResponse.json(
          { success: false, error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
      }

      const scraperResult = await scraper.scrape(username);

      if (!scraperResult.success) {
        if (scraperResult.requiresManualEntry) {
          return NextResponse.json(
            { success: false, requiresManualEntry: true },
            { status: 422 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            error:
              "We couldn't fetch that profile. Check the username and try again.",
          },
          { status: 422 }
        );
      }

      profileData = scraperResult.profile;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    if (!profileData) {
      return NextResponse.json(
        { success: false, error: "No profile data available" },
        { status: 400 }
      );
    }

    // 5. Extract captions for NLP
    const captions: string[] = [];
    if ("recentPosts" in profileData && profileData.recentPosts) {
      for (const post of profileData.recentPosts) {
        if (post.caption) captions.push(post.caption);
      }
    }

    // 6. NLP + Trends enrichment in parallel
    const [nlpResult, trendResult] = await Promise.all([
      Promise.resolve().then(() => {
        try {
          return analyzeCaption(captions);
        } catch {
          return null;
        }
      }),
      Promise.resolve().then(async () => {
        try {
          let niche = "";
          if ("contentNiche" in profileData && profileData.contentNiche) {
            niche = profileData.contentNiche as string;
          } else if ("biography" in profileData && profileData.biography) {
            niche =
              (profileData.biography as string)
                .split(/[,.|!\n]/)
                .filter(Boolean)[0]
                ?.trim() || "";
          }
          if (niche) return await getTrendDirection(niche);
          return null;
        } catch {
          return null;
        }
      }),
    ]);

    // 7. AI analysis — Pro users get multi-agent debate (D-01), free users get single-agent (D-05, AI-02)
    const analysis = isPro
      ? await runMultiAgentAnalysis(profileData, nlpResult, trendResult)
      : await analyzeWithApi(profileData, nlpResult, trendResult);

    if (!analysis.success) {
      return NextResponse.json(
        { success: false, error: analysis.error ?? "Analysis failed" },
        { status: 500 }
      );
    }

    // Attach NLP and trend data
    if (analysis.report) {
      if (nlpResult) analysis.report.nlp = nlpResult;
      if (trendResult) analysis.report.trend = trendResult;
    }

    // Save to reports table for caching (AI-06)
    try {
      await supabase.from("reports").insert({
        user_id: user.id,
        platform: platform || "instagram",
        username: username || "manual",
        report_type: "analysis",
        report_data: analysis.report,
      });
    } catch {
      // Cache write failure is non-fatal
    }

    // Increment usage only on SUCCESS (failed analyses don't count)
    try {
      await supabase.rpc("check_and_increment_usage", {
        p_user_id: user.id,
        p_limit: isPro ? 999999 : 3,
      });
    } catch {
      // Usage increment failure is non-fatal — user already got their report
    }

    return NextResponse.json({ success: true, report: analysis.report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
