// src/components/reports/ReportCard.tsx
import Link from "next/link";
import type { AnalysisReport } from "@/lib/types";

interface ReportRow {
  id: string;
  platform: string;
  username: string;
  report_type: string;
  analyzed_at: string;
  report_data: AnalysisReport;
}

interface ReportCardProps {
  report: ReportRow;
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border text-[#8a8580] bg-white/5 border-white/[0.06]">
        —
      </span>
    );
  }

  let colorClasses: string;
  if (score >= 70) {
    colorClasses = "text-green-400 bg-green-500/10 border-green-500/20";
  } else if (score >= 40) {
    colorClasses = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  } else {
    colorClasses = "text-red-400 bg-red-500/10 border-red-500/20";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
    >
      {score}
    </span>
  );
}

export function ReportCard({ report }: ReportCardProps) {
  const score =
    (report.report_data as AnalysisReport).profileScore?.overall ?? 0;

  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(report.analyzed_at));
    } catch {
      return report.analyzed_at;
    }
  })();

  return (
    <Link
      href={`/reports/${report.id}`}
      className="block bg-[#141414] border border-white/[0.06] rounded-xl p-5 hover:border-rose-500/20 transition-colors"
    >
      {/* Top row: platform badge + report type */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 capitalize">
          {report.platform}
        </span>
        {report.report_type && report.report_type !== "analysis" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-[#8a8580] border border-white/[0.06] capitalize">
            {report.report_type}
          </span>
        )}
      </div>

      {/* Middle: username */}
      <p className="text-base font-semibold mt-3">@{report.username}</p>

      {/* Bottom: date + score badge */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-[#8a8580]">{formattedDate}</span>
        <ScoreBadge score={score} />
      </div>
    </Link>
  );
}
