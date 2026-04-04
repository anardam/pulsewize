// src/components/dashboard/ActivityFeed.tsx
import Link from "next/link";

interface ActivityRow {
  id: string;
  platform: string;
  username: string;
  report_type: string;
  analyzed_at: string;
}

interface ActivityFeedProps {
  reports: ActivityRow[];
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  comparison: "Comparison",
  calendar: "Calendar",
  hashtags: "Hashtags",
};

export function ActivityFeed({ reports }: ActivityFeedProps) {
  if (reports.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-10 flex flex-col items-center text-center">
        <p className="text-sm font-medium">No analyses yet</p>
        <p className="text-sm text-[#8a8580] mt-1">
          No analyses yet &mdash; run your first to see activity here.
        </p>
        <Link
          href="/analyze"
          className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-600/20 text-white transition-colors"
        >
          Analyze a profile
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-xl divide-y divide-white/[0.06]">
      {reports.map((report) => {
        const date = new Date(report.analyzed_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const platformLabel =
          report.platform.charAt(0).toUpperCase() + report.platform.slice(1);
        const typeLabel =
          report.report_type !== "analysis"
            ? REPORT_TYPE_LABELS[report.report_type]
            : null;

        return (
          <div key={report.id} className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium">@{report.username}</p>
                <p className="text-xs text-[#8a8580] mt-0.5">
                  {platformLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {typeLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-white/[0.12] text-[#8a8580]">
                  {typeLabel}
                </span>
              )}
              <span className="text-xs text-[#8a8580]">{date}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
