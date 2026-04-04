"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartPoint } from "@/lib/chart-data";

interface Props {
  data: ChartPoint[];
  title?: string;
}

export function GrowthChart({ data, title = "Growth Trend" }: Props) {
  if (data.length < 2) {
    return (
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6">
        <p className="text-sm font-medium mb-2">{title}</p>
        <div className="flex items-center justify-center h-[220px] text-sm text-[#8a8580]">
          Analyze the same profile again to track growth
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6">
      <p className="text-sm font-medium mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            stroke="#666"
            tick={{ fill: "#666", fontSize: 11 }}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: "#666", fontSize: 11 }}
            width={38}
          />
          <Tooltip
            contentStyle={{
              background: "#111118",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#ededed" }}
            itemStyle={{ color: "#a855f7" }}
          />
          <Area
            type="monotone"
            dataKey="engagement"
            name="Engagement %"
            stroke="#a855f7"
            strokeWidth={2}
            fill="url(#engagementGrad)"
          />
          <Area
            type="monotone"
            dataKey="score"
            name="Profile Score"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#scoreGrad)"
          />
          <Area
            type="monotone"
            dataKey="estimatedReach"
            name="Est. Reach"
            stroke="#6d28d9"
            strokeWidth={2}
            fill="url(#reachGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
