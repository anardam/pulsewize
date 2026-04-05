"use client";
import dynamic from "next/dynamic";
import type { ChartPoint } from "@/lib/chart-data";

const GrowthChart = dynamic(
  () =>
    import("@/components/dashboard/GrowthChart").then((m) => ({
      default: m.GrowthChart,
    })),
  { ssr: false }
);

interface Props {
  data: ChartPoint[];
  username: string;
}

export function GrowthChartWrapper({ data, username }: Props) {
  const displayUsername = username.replace(/^@+/, "");
  return (
    <GrowthChart
      data={data}
      title="Momentum snapshot"
      subtitle={`@${displayUsername}`}
    />
  );
}
