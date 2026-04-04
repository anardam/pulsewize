// src/lib/platform-health.ts
// Reads platform health status from Supabase.
// Falls back to all-ok if Supabase is unreachable (non-blocking).
//
// Migration SQL (supabase/migrations/20260331_platform_health.sql):
// create table if not exists public.platform_health (
//   id          uuid primary key default gen_random_uuid(),
//   platform    text not null unique,
//   status      text not null check (status in ('ok', 'degraded', 'down')),
//   checked_at  timestamptz not null default now(),
//   error_msg   text
// );
import { createClient } from "@supabase/supabase-js";

export type PlatformStatus = "ok" | "degraded" | "down";

export type PlatformHealthMap = Record<string, PlatformStatus>;

const PLATFORMS = ["instagram", "youtube", "twitter", "tiktok", "linkedin", "facebook"] as const;

type Platform = typeof PLATFORMS[number];

const DEFAULT_HEALTH: PlatformHealthMap = Object.fromEntries(
  PLATFORMS.map((p) => [p, "ok" as PlatformStatus])
);

export async function getPlatformHealth(): Promise<PlatformHealthMap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { ...DEFAULT_HEALTH };
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("platform_health")
      .select("platform, status");

    if (error || !data) {
      return { ...DEFAULT_HEALTH };
    }

    const health: PlatformHealthMap = { ...DEFAULT_HEALTH };
    for (const row of data) {
      if (PLATFORMS.includes(row.platform as Platform)) {
        health[row.platform] = row.status as PlatformStatus;
      }
    }
    return health;
  } catch {
    return { ...DEFAULT_HEALTH };
  }
}
