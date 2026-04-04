import type { AnalysisReport } from "@/lib/types";

export interface ChartPoint {
  date: string;
  engagement: number;
  score: number;
  estimatedReach: number;
}

interface ReportRow {
  report_data: AnalysisReport;
  analyzed_at: string;
}

export function buildChartData(rows: ReportRow[]): ChartPoint[] {
  return rows
    .slice()
    .sort(
      (a, b) =>
        new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime()
    )
    .map((r) => ({
      date: new Date(r.analyzed_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      engagement: r.report_data?.engagementStats?.rate ?? 0,
      score: r.report_data?.profileScore?.overall ?? 0,
      estimatedReach: r.report_data?.engagementStats?.estimatedReach ?? 0,
    }));
}
