// src/app/(dashboard)/reports/page.tsx
import Link from "next/link";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { Pagination } from "@/components/reports/Pagination";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports — SocialLens" };

const PAGE_SIZE = 12;

interface Props {
  searchParams: Promise<{
    page?: string;
    platform?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const page = Math.max(1, Number(params.page) || 1);
  const platform = params.platform ?? "";
  const search = params.search ?? "";
  const dateFrom = params.dateFrom ?? "";
  const dateTo = params.dateTo ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("reports")
    .select("id, platform, username, report_type, analyzed_at, report_data", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .order("analyzed_at", { ascending: false })
    .range(from, to);

  if (platform) query = query.eq("platform", platform);
  if (search) query = query.ilike("username", `%${search}%`);
  if (dateFrom) query = query.gte("analyzed_at", dateFrom);
  if (dateTo) query = query.lte("analyzed_at", `${dateTo}T23:59:59Z`);

  const { data: reports, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const hasFilters = !!(search || platform || dateFrom || dateTo);

  return (
    <>
      <TopNav activePath="/reports" />
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Page header */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold">Reports</h1>
            <Link
              href="/analyze"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              New analysis
            </Link>
          </div>

          {/* Filters */}
          <ReportFilters
            platform={platform}
            search={search}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />

          {/* Results */}
          {reports && reports.length > 0 ? (
            <>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination page={page} totalPages={totalPages} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 bg-[#111118] border border-white/[0.08] rounded-xl p-10 flex flex-col items-center text-center">
              <FileText size={40} className="text-muted-foreground" />
              <p className="text-sm font-medium mt-4">No reports found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFilters
                  ? "Try clearing your filters"
                  : "Run your first analysis to see reports here"}
              </p>
              <Link
                href="/analyze"
                className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                Analyze a profile
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
