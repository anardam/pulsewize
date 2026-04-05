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
  subtitle?: string;
}

export function GrowthChart({
  data,
  title = "Growth Trend",
  subtitle,
}: Props) {
  if (data.length < 2) {
    return (
      <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(25,25,25,0.92),rgba(16,16,16,0.94))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
        <div className="mb-5 space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/75">
            {title}
          </p>
          {subtitle ? (
            <p className="text-lg font-semibold tracking-tight text-[#f5efe7]">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex h-[260px] flex-col items-center justify-center rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_48%),rgba(0,0,0,0.18)] px-8 text-center ring-1 ring-inset ring-white/[0.05]">
          <div className="mb-4 inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#8a8580]">
            Waiting for the next read
          </div>
          <p className="text-sm font-medium text-[#f2ece4]">No movement yet</p>
          <p className="mt-2 max-w-[260px] text-sm leading-6 text-[#8a8580]">
            Analyze the same profile again and we&apos;ll start mapping how its engagement,
            score, and estimated reach are shifting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(25,25,25,0.92),rgba(16,16,16,0.94))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/75">
            {title}
          </p>
          {subtitle ? (
            <p className="text-lg font-semibold tracking-tight text-[#f5efe7]">{subtitle}</p>
          ) : null}
        </div>
        <div className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#8a8580] sm:inline-flex">
          Engagement, score, reach
        </div>
      </div>
      <div className="rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_42%),rgba(0,0,0,0.14)] p-3 ring-1 ring-inset ring-white/[0.04]">
      <ResponsiveContainer width="100%" height={236}>
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f5efe7" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#f5efe7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            stroke="#6f6963"
            tick={{ fill: "#8a8580", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#6f6963"
            tick={{ fill: "#8a8580", fontSize: 11 }}
            width={38}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#111111",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
            }}
            labelStyle={{ color: "#f5efe7" }}
            itemStyle={{ color: "#f5efe7" }}
          />
          <Area
            type="monotone"
            dataKey="engagement"
            name="Engagement %"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#engagementGrad)"
          />
          <Area
            type="monotone"
            dataKey="score"
            name="Profile Score"
            stroke="#e11d48"
            strokeWidth={2}
            fill="url(#scoreGrad)"
          />
          <Area
            type="monotone"
            dataKey="estimatedReach"
            name="Est. Reach"
            stroke="#f5efe7"
            strokeWidth={2}
            fill="url(#reachGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
