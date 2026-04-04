// GET /api/platform-health
// Returns current platform health status. No auth required — non-sensitive data.
import { NextResponse } from "next/server";
import { getPlatformHealth } from "@/lib/platform-health";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const health = await getPlatformHealth();
  return NextResponse.json({ success: true, data: health });
}
