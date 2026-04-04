"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { TopNav } from "@/components/nav/TopNav";
import ReportDashboard from "@/components/ReportDashboard";
import type { AnalysisReport } from "@/lib/types";

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [platform, setPlatform] = useState("instagram");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Report not found");
        setLoading(false);
        return;
      }

      setReport(data.report_data as AnalysisReport);
      setPlatform(data.platform || "instagram");
      setLoading(false);
    }

    loadReport();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-rose-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-[#8a8580]">Loading report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8a8580] mb-4">{error || "Report not found"}</p>
          <button
            onClick={() => router.push("/reports")}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          >
            Back to reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <ReportDashboard
        report={report}
        onNewAnalysis={() => router.push("/analyze")}
        platform={platform}
      />
    </div>
  );
}
