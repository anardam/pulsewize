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
      <main className="min-h-screen bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-rose-400/80 mb-1">
                History
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
              {(count ?? 0) > 0 && (
                <p className="text-sm text-[#8a8580] mt-1">{count} total reports</p>
              )}
            </div>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-xl hover:shadow-rose-600/20 w-fit"
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
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {reports.map((r, i) => (
                  <ReportCard key={r.id} report={r} index={i} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination page={page} totalPages={totalPages} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-white/[0.08] bg-[#141414]/50 p-14 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center mb-5">
                <FileText size={24} className="text-rose-400" />
              </div>
              <p className="text-base font-semibold text-[#e8e4df]">No reports yet</p>
              <p className="text-sm text-[#8a8580] mt-1.5 max-w-[300px]">
                {hasFilters
                  ? "No reports match your filters. Try adjusting your search."
                  : "Run your first analysis and your reports will appear here."}
              </p>
              <Link
                href="/analyze"
                className="mt-6 inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20"
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
