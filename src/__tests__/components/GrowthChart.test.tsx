import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const componentPath = path.resolve(
  __dirname,
  "../../components/dashboard/GrowthChart.tsx"
);
const source = readFileSync(componentPath, "utf-8");

describe("GrowthChart", () => {
  it("has use client directive", () => {
    expect(source).toMatch(/^"use client"/);
  });

  it("imports from recharts", () => {
    expect(source).toContain('from "recharts"');
  });

  it("renders AreaChart when data has 2 or more points", () => {
    expect(source).toContain("AreaChart");
  });

  it("includes engagement, score, and estimatedReach Areas", () => {
    expect(source).toContain('dataKey="engagement"');
    expect(source).toContain('dataKey="score"');
    expect(source).toContain('dataKey="estimatedReach"');
  });

  it("shows empty state text when data has fewer than 2 points", () => {
    expect(source).toContain("Analyze the same profile again and we&apos;ll start mapping");
    expect(source).toContain("data.length < 2");
  });

  it("uses ResponsiveContainer with 100% width and height 236", () => {
    expect(source).toContain('width="100%"');
    expect(source).toContain("height={236}");
  });

  it("applies purple gradient to engagement area", () => {
    expect(source).toContain("#a855f7");
    expect(source).toContain("engagementGrad");
  });
});
