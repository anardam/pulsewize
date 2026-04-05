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

const PLATFORM_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: FaInstagram, color: "#E1306C", label: "Instagram" },
  youtube: { icon: FaYoutube, color: "#FF0000", label: "YouTube" },
  twitter: { icon: FaXTwitter, color: "#1DA1F2", label: "X" },
  tiktok: { icon: FaTiktok, color: "#00f2ea", label: "TikTok" },
  linkedin: { icon: FaLinkedinIn, color: "#0A66C2", label: "LinkedIn" },
  facebook: { icon: FaFacebookF, color: "#1877F2", label: "Facebook" },
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
          href="/dashboard#studio"
          className="mt-5 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20"
        >
          Start with a profile
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(25,25,25,0.92),rgba(16,16,16,0.94))] shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
      {reports.map((report, i) => {
        const meta = PLATFORM_META[report.platform] ?? PLATFORM_META.instagram;
        const Icon = meta.icon;
        const date = new Date(report.analyzed_at);
        const timeAgo = getTimeAgo(date);
        const displayUsername = report.username.replace(/^@+/, "");

        return (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Link
              href={`/reports/${report.id}`}
              className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:px-6 ${
                i > 0 ? "border-t border-white/[0.04]" : ""
              }`}
            >
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  backgroundColor: `${meta.color}12`,
                  borderColor: `${meta.color}22`,
                }}
              >
                <Icon size={16} style={{ color: meta.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[#f2ece4]">
                    {meta.label}
                  </p>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
                    style={{ backgroundColor: `${meta.color}16`, color: meta.color }}
                  >
                    latest read
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-[#b4ada6]">
                  @{displayUsername}
                </p>
              </div>

              {report.report_type !== "analysis" && (
                <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] capitalize text-[#8a8580]">
                  {report.report_type}
                </span>
              )}

              <span className="whitespace-nowrap text-[11px] text-[#6f6963]">
                {timeAgo}
              </span>

              <ArrowUpRight
                size={13}
                className="flex-shrink-0 text-[#5a5550] opacity-0 transition-opacity group-hover:opacity-100"
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
