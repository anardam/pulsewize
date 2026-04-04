"use client";
import { motion } from "framer-motion";
import { BarChart3, Globe, Crown, Zap } from "lucide-react";

interface Props {
  totalReports: number;
  platformCount: number;
  plan: "free" | "pro";
  usageCount: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.23, 1, 0.32, 1] },
  }),
};

export function StatsCards({ totalReports, platformCount, plan, usageCount }: Props) {
  const usageLimit = plan === "pro" ? "unlimited" : "3";
  const usagePercent = plan === "pro" ? 0 : Math.min((usageCount / 3) * 100, 100);

  const stats = [
    {
      label: "Total Analyses",
      value: totalReports.toLocaleString(),
      icon: BarChart3,
      accent: "from-rose-500/20 to-rose-600/5",
      iconColor: "text-rose-400",
    },
    {
      label: "Platforms",
      value: platformCount.toString(),
      sub: "of 6 active",
      icon: Globe,
      accent: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-400",
    },
    {
      label: "Plan",
      value: plan === "pro" ? "Pro" : "Free",
      icon: Crown,
      accent: plan === "pro" ? "from-amber-500/20 to-amber-600/5" : "from-zinc-500/10 to-zinc-600/5",
      iconColor: plan === "pro" ? "text-amber-400" : "text-zinc-400",
      badge: plan === "pro",
    },
    {
      label: "This Month",
      value: `${usageCount}`,
      sub: `/ ${usageLimit}`,
      icon: Zap,
      accent: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-400",
      progress: plan !== "pro" ? usagePercent : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#141414] p-5 hover:border-white/[0.1] transition-all duration-300"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium tracking-wide uppercase text-[#8a8580]">
                {stat.label}
              </span>
              <stat.icon size={15} className={`${stat.iconColor} opacity-60`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-[#e8e4df]">
                {stat.value}
              </span>
              {stat.sub && <span className="text-xs text-[#8a8580]">{stat.sub}</span>}
              {stat.badge && (
                <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
            {stat.progress !== undefined && (
              <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.progress}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
