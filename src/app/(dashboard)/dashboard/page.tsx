// src/app/(dashboard)/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { TopNav } from "@/components/nav/TopNav";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { GrowthChartWrapper } from "@/components/dashboard/GrowthChartWrapper";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildChartData } from "@/lib/chart-data";
import type { Metadata } from "next";

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
      <main className="min-h-screen bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-rose-400/80 mb-1">
                {monthName}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Dashboard
              </h1>
            </div>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-xl hover:shadow-rose-600/20 w-fit"
            >
              <Search className="h-4 w-4" />
              New analysis
            </Link>
          </div>

          {/* Stats */}
          <StatsCards
            totalReports={totalReports}
            platformCount={platformCount}
            plan={plan}
            usageCount={usageCount}
          />

          {/* Two-column layout on desktop */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Activity — wider */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-[#8a8580]">
                  Recent Activity
                </h2>
                <Link
                  href="/reports"
                  className="text-xs text-rose-400/80 hover:text-rose-300 transition-colors"
                >
                  View all
                </Link>
              </div>
              <ActivityFeed reports={recentReports ?? []} />
            </div>

            {/* Chart — narrower */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-[#8a8580] mb-4">
                {topHandle ? `Growth — @${topHandle}` : "Growth Trends"}
              </h2>
              {topHandle ? (
                <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-4">
                  <GrowthChartWrapper
                    data={chartPoints}
                    title={`@${topHandle}`}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#141414]/50 p-10 flex flex-col items-center text-center">
                  <p className="text-sm text-[#8a8580]">
                    Charts appear after your second analysis of the same profile.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
