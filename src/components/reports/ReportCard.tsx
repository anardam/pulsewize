"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import {
  FaInstagram,
  FaYoutube,
  FaXTwitter,
  FaTiktok,
  FaLinkedinIn,
  FaFacebookF,
} from "react-icons/fa6";
import type { AnalysisReport } from "@/lib/types";

interface ReportRow {
  id: string;
  platform: string;
  username: string;
  report_type: string;
  analyzed_at: string;
  report_data: AnalysisReport;
}

interface Props {
  report: ReportRow;
  index?: number;
}

const PLATFORM_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: FaInstagram, color: "#E1306C", label: "Instagram" },
  youtube: { icon: FaYoutube, color: "#FF0000", label: "YouTube" },
  twitter: { icon: FaXTwitter, color: "#1DA1F2", label: "Twitter/X" },
  tiktok: { icon: FaTiktok, color: "#00f2ea", label: "TikTok" },
  linkedin: { icon: FaLinkedinIn, color: "#0A66C2", label: "LinkedIn" },
  facebook: { icon: FaFacebookF, color: "#1877F2", label: "Facebook" },
};

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return null;

  const config =
    score >= 70
      ? { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Strong" }
      : score >= 40
        ? { bg: "bg-amber-500/15", text: "text-amber-400", label: "Average" }
        : { bg: "bg-red-500/15", text: "text-red-400", label: "Needs work" };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg}`}>
      <span className={`text-lg font-bold ${config.text}`}>{score}</span>
      <span className={`text-[10px] font-medium ${config.text} opacity-70`}>{config.label}</span>
    </div>
  );
}

export function ReportCard({ report, index = 0 }: Props) {
  const score = report.report_data?.profileScore?.overall ?? 0;
  const meta = PLATFORM_META[report.platform] ?? PLATFORM_META.instagram;
  const Icon = meta.icon;

  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(report.analyzed_at));
    } catch {
      return "";
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        href={`/reports/${report.id}`}
        className="group block rounded-xl border border-white/[0.06] bg-[#141414] p-5 hover:border-white/[0.12] hover:bg-[#181818] transition-all duration-300"
      >
        {/* Top: platform + date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${meta.color}15` }}
            >
              <Icon size={13} style={{ color: meta.color }} />
            </div>
            <span className="text-[11px] font-medium text-[#8a8580]">{meta.label}</span>
          </div>
          <span className="text-[11px] text-[#5a5550]">{formattedDate}</span>
        </div>

        {/* Username */}
        <p className="text-base font-semibold text-[#e8e4df] group-hover:text-white transition-colors">
          @{report.username}
        </p>

        {/* Bottom: score + arrow */}
        <div className="flex items-center justify-between mt-4">
          <ScoreBadge score={score} />
          <ArrowUpRight
            size={15}
            className="text-[#5a5550] group-hover:text-rose-400 transition-colors"
          />
        </div>
      </Link>
    </motion.div>
  );
}
