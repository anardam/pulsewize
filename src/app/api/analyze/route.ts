import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getScraper } from "@/lib/scrapers/registry";
import { analyzeWithApi } from "@/lib/claude-api";
import { runMultiAgentAnalysis } from "@/lib/ai/orchestrator";
import { analyzeCaption } from "@/lib/nlp";
import { getTrendDirection } from "@/lib/trends";
import { ManualProfileInput } from "@/lib/types";
import type { ConnectedAccountRecord } from "@/lib/connections/types";
import { getConnectionProvider } from "@/lib/connections";
import type { NormalizedProfile } from "@/lib/scrapers/types";
import {
  decryptConnectionToken,
  encryptConnectionToken,
} from "@/lib/connection-secrets";
import { createRequestId, logError, logInfo } from "@/lib/observability";

async function getConnectedProfileData(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  userId: string,
  connectedAccountId: string
): Promise<NormalizedProfile> {
  const { data: account, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("id", connectedAccountId)
    .eq("user_id", userId)
    .single();

  if (error || !account) {
    throw new Error(error?.message ?? "Connected account not found");
  }

  const typedAccount = account as ConnectedAccountRecord;
  const provider = getConnectionProvider(typedAccount.platform);
  let accessToken = decryptConnectionToken(typedAccount.access_token) ?? "";
  let tokenExpiresAt = typedAccount.token_expires_at;
  let scopes = typedAccount.scopes;
  const refreshToken = decryptConnectionToken(typedAccount.refresh_token);

  if (refreshToken) {
    const refreshed = await provider.refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    tokenExpiresAt = refreshed.expiresAt ?? tokenExpiresAt;
    scopes = refreshed.scopes.length > 0 ? refreshed.scopes : scopes;

    await supabase
      .from("connected_accounts")
      .update({
        access_token: encryptConnectionToken(accessToken),
        refresh_token: encryptConnectionToken(refreshed.refreshToken ?? refreshToken),
        token_expires_at: tokenExpiresAt,
        scopes,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedAccount.id);
  }

  const snapshot = await provider.fetchSnapshot(accessToken);
  const now = new Date().toISOString();

  await supabase.from("account_snapshots").insert({
    connected_account_id: typedAccount.id,
    fetched_at: now,
    profile_data: snapshot.profileData,
    metrics_data: snapshot.metricsData,
  });

  await supabase
    .from("connected_accounts")
    .update({
      username: snapshot.normalizedProfile.username,
      display_name: snapshot.normalizedProfile.fullName,
      avatar_url: snapshot.normalizedProfile.profilePicUrl,
      last_synced_at: now,
      status: "active",
      updated_at: now,
    })
    .eq("id", typedAccount.id);

  return snapshot.normalizedProfile;
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const usageLimitsDisabled = process.env.NEXT_PUBLIC_DISABLE_USAGE_LIMITS === "true";
  // 1. Auth check — require Supabase session
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logInfo("analysis_unauthorized", {
      requestId,
      route: "analyze",
    });
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

  // 2b. Check usage limit (don't increment yet — only count on success)
  if (!isPro && !usageLimitsDisabled) {
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
    const cachedConnectedAccountId = (bodyPeek as { connectedAccountId?: string }).connectedAccountId;

    if (cachedConnectedAccountId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: cached } = await supabase
        .from("reports")
        .select("report_data")
        .eq("connected_account_id", cachedConnectedAccountId)
        .eq("report_type", "analysis")
        .gt("created_at", oneHourAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.report_data) {
        return NextResponse.json({ success: true, report: cached.report_data, cached: true });
      }
    } else if (cachedUsername) {
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
    const { username, manualData, platform = "instagram", connectedAccountId } = body as {
      username?: string;
      manualData?: ManualProfileInput;
      platform?: string;
      connectedAccountId?: string;
    };

    logInfo("analysis_started", {
      requestId,
      route: "analyze",
      userId: user.id,
      platform,
      username: username?.replace(/^@+/, ""),
      connectedAccountId,
      source:
        connectedAccountId ? "official_api" : manualData ? "manual" : "public_profile",
    });

    if (!username && !manualData && !connectedAccountId) {
      return NextResponse.json(
        { success: false, error: "username, manualData, or connectedAccountId is required" },
        { status: 400 }
      );
    }

    let profileData: NormalizedProfile | ManualProfileInput | undefined;
    let reportSourceType: "official_api" | "scraper" | "manual" = "scraper";

    if (connectedAccountId) {
      profileData = await getConnectedProfileData(supabase, user.id, connectedAccountId);
      reportSourceType = "official_api";
    } else if (manualData) {
      // Manual entry bypass — skip scraping
      profileData = manualData;
      reportSourceType = "manual";
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
        logError("analysis_scrape_failed", scraperResult.error, {
          requestId,
          route: "analyze",
          userId: user.id,
          platform,
          username: username.replace(/^@+/, ""),
        });
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
      logError("analysis_generation_failed", analysis.error, {
        requestId,
        route: "analyze",
        userId: user.id,
        platform,
        username: username?.replace(/^@+/, ""),
        connectedAccountId,
      });
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
        platform: "platform" in profileData ? profileData.platform : platform || "instagram",
        username: profileData.username || username || "manual",
        report_type: "analysis",
        report_data: analysis.report,
        source_type: reportSourceType,
        connected_account_id: connectedAccountId ?? null,
      });
    } catch {
      // Cache write failure is non-fatal
    }

    // Increment usage only on SUCCESS (failed analyses don't count)
    try {
      if (!usageLimitsDisabled) {
        await supabase.rpc("check_and_increment_usage", {
          p_user_id: user.id,
          p_limit: isPro ? 999999 : 3,
        });
      }
    } catch {
      // Usage increment failure is non-fatal — user already got their report
    }

    if (analysis.report) {
      analysis.report.sourceType = reportSourceType;
    }

    logInfo("analysis_completed", {
      requestId,
      route: "analyze",
      userId: user.id,
      platform: ("platform" in profileData ? profileData.platform : platform) || "instagram",
      username: (profileData.username || username || "manual").replace(/^@+/, ""),
      connectedAccountId,
      reportSourceType,
      plan: isPro ? "pro" : "free",
    });

    return NextResponse.json({ success: true, report: analysis.report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    logError("analysis_unhandled_failure", error, {
      requestId,
      route: "analyze",
      userId: user.id,
    });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
