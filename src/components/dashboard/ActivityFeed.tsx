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

interface ActivityRow {
  id: string;
  platform: string;
  username: string;
  report_type: string;
  analyzed_at: string;
}

interface Props {
  reports: ActivityRow[];
}

const PLATFORM_META: Record<string, { icon: React.ElementType; color: string }> = {
  instagram: { icon: FaInstagram, color: "#E1306C" },
  youtube: { icon: FaYoutube, color: "#FF0000" },
  twitter: { icon: FaXTwitter, color: "#1DA1F2" },
  tiktok: { icon: FaTiktok, color: "#00f2ea" },
  linkedin: { icon: FaLinkedinIn, color: "#0A66C2" },
  facebook: { icon: FaFacebookF, color: "#1877F2" },
};

export function ActivityFeed({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed border-white/[0.08] bg-[#141414]/50 p-12 flex flex-col items-center text-center"
      >
        <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
          <ArrowUpRight size={20} className="text-rose-400" />
        </div>
        <p className="text-sm font-medium text-[#e8e4df]">No analyses yet</p>
        <p className="text-sm text-[#8a8580] mt-1 max-w-[280px]">
          Run your first analysis to see your activity here.
        </p>
        <Link
          href="/analyze"
          className="mt-5 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20"
        >
          Analyze a profile
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141414] overflow-hidden">
      {reports.map((report, i) => {
        const meta = PLATFORM_META[report.platform] ?? PLATFORM_META.instagram;
        const Icon = meta.icon;
        const date = new Date(report.analyzed_at);
        const timeAgo = getTimeAgo(date);

        return (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Link
              href={`/reports/${report.id}`}
              className={`flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group ${
                i > 0 ? "border-t border-white/[0.04]" : ""
              }`}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${meta.color}15` }}
              >
                <Icon size={14} style={{ color: meta.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e8e4df] truncate">
                  @{report.username}
                </p>
              </div>

              {report.report_type !== "analysis" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-[#8a8580] capitalize">
                  {report.report_type}
                </span>
              )}

              <span className="text-[11px] text-[#5a5550] whitespace-nowrap">
                {timeAgo}
              </span>

              <ArrowUpRight
                size={13}
                className="text-[#5a5550] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
