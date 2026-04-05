import { redirect } from "next/navigation";
import { HomeWorkspace } from "@/components/home/HomeWorkspace";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildChartData } from "@/lib/chart-data";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home \u2014 Pulsewize" };

export default async function DashboardPage() {
  const usageLimitsDisabled = process.env.NEXT_PUBLIC_DISABLE_USAGE_LIMITS === "true";
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const monthName = now.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const billingMonth = now.toISOString().slice(0, 7) + "-01";

  // Fetch total reports count
  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Fetch distinct platforms
  const { data: platformRows } = await supabase
    .from("reports")
    .select("platform")
    .eq("user_id", user.id);

  // Fetch recent 10 reports for activity feed
  const { data: recentReports } = await supabase
    .from("reports")
    .select("id, platform, username, report_type, analyzed_at")
    .eq("user_id", user.id)
    .order("analyzed_at", { ascending: false })
    .limit(10);

  // Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  // Fetch usage for this billing month
  const { data: usage } = await supabase
    .from("usage")
    .select("analyses_used")
    .eq("user_id", user.id)
    .eq("billing_month", billingMonth)
    .single();

  // Fetch recent analysis rows to build momentum views
  const { data: momentumRows } = await supabase
    .from("reports")
    .select("username, platform, report_data, analyzed_at")
    .eq("user_id", user.id)
    .eq("report_type", "analysis")
    .order("analyzed_at", { ascending: false })
    .limit(60);

  const momentumGroups = new Map<
    string,
    {
      username: string;
      platform: string;
      rows: Array<{
        report_data: import("@/lib/types").AnalysisReport;
        analyzed_at: string;
      }>;
    }
  >();

  for (const row of momentumRows ?? []) {
    const key = `${row.platform}:${row.username}`;
    const existing = momentumGroups.get(key);

    if (existing) {
      existing.rows.push({
        report_data: row.report_data,
        analyzed_at: row.analyzed_at,
      });
      continue;
    }

    momentumGroups.set(key, {
      username: row.username,
      platform: row.platform,
      rows: [
        {
          report_data: row.report_data,
          analyzed_at: row.analyzed_at,
        },
      ],
    });
  }

  const momentumProfiles = Array.from(momentumGroups.entries())
    .map(([key, group]) => ({
      key,
      username: group.username,
      platform: group.platform,
      analyses: group.rows.length,
      points: buildChartData(group.rows),
    }))
    .sort((a, b) => b.analyses - a.analyses)
    .slice(0, 5);

  // Derive computed values
  const plan = (subscription?.plan ?? "free") as "free" | "pro";
  const platformCount = new Set(
    platformRows?.map((r) => r.platform) ?? []
  ).size;
  const totalReports = count ?? 0;
  const usageCount = usage?.analyses_used ?? 0;

  const { data: connectedAccounts } = await supabase
    .from("connected_accounts")
    .select("id, platform, username, display_name, avatar_url, status, connected_at, last_synced_at")
    .eq("user_id", user.id)
    .order("connected_at", { ascending: false });

  return (
    <HomeWorkspace
      monthName={monthName}
      totalReports={totalReports}
      platformCount={platformCount}
      plan={plan}
      usageCount={usageCount}
      usageLimitsDisabled={usageLimitsDisabled}
      recentReports={recentReports ?? []}
      momentumProfiles={momentumProfiles}
      connectedAccounts={connectedAccounts ?? []}
    />
  );
}
