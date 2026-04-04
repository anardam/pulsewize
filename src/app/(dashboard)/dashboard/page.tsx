// src/app/(dashboard)/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { TopNav } from "@/components/nav/TopNav";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildChartData } from "@/lib/chart-data";
import type { Metadata } from "next";

const GrowthChart = dynamic(
  () =>
    import("@/components/dashboard/GrowthChart").then((m) => ({
      default: m.GrowthChart,
    })),
  { ssr: false }
);

export const metadata: Metadata = { title: "Dashboard \u2014 SocialLens" };

export default async function DashboardPage() {
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

  // Find the most-analyzed profile handle
  const { data: topHandleRows } = await supabase
    .from("reports")
    .select("username")
    .eq("user_id", user.id)
    .eq("report_type", "analysis")
    .order("analyzed_at", { ascending: false })
    .limit(30);

  const handleCounts = (topHandleRows ?? []).reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.username] = (acc[r.username] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const topHandle =
    Object.entries(handleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Fetch chart data for the top handle
  let chartPoints: import("@/lib/chart-data").ChartPoint[] = [];
  if (topHandle) {
    const { data: chartRows } = await supabase
      .from("reports")
      .select("report_data, analyzed_at")
      .eq("user_id", user.id)
      .eq("username", topHandle)
      .eq("report_type", "analysis")
      .order("analyzed_at", { ascending: true })
      .limit(30);
    chartPoints = buildChartData(
      (chartRows ?? []) as Array<{
        report_data: import("@/lib/types").AnalysisReport;
        analyzed_at: string;
      }>
    );
  }

  // Derive computed values
  const plan = (subscription?.plan ?? "free") as "free" | "pro";
  const platformCount = new Set(
    platformRows?.map((r) => r.platform) ?? []
  ).size;
  const totalReports = count ?? 0;
  const usageCount = usage?.analyses_used ?? 0;

  return (
    <>
      <TopNav activePath="/dashboard" />
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header + CTA */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {monthName} overview
              </p>
            </div>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              <Search className="h-4 w-4" />
              Analyze a profile
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-6">
            <StatsCards
              totalReports={totalReports}
              platformCount={platformCount}
              plan={plan}
              usageCount={usageCount}
            />
          </div>

          {/* Recent activity */}
          <div className="mt-8">
            <h2 className="text-base font-semibold mb-4">Recent activity</h2>
            <ActivityFeed reports={recentReports ?? []} />
          </div>

          {/* Growth chart */}
          {topHandle && (
            <div className="mt-8">
              <h2 className="text-base font-semibold mb-4">
                Growth trend &mdash; @{topHandle}
              </h2>
              <GrowthChart
                data={chartPoints}
                title={`@${topHandle} — engagement, score & reach`}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
