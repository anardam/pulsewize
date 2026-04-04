import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const platform = searchParams.get("platform") ?? "";
  const search = searchParams.get("search") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("reports")
    .select(
      "id, platform, username, report_type, analyzed_at, report_data",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("analyzed_at", { ascending: false })
    .range(from, to);

  if (platform) query = query.eq("platform", platform);
  if (search) query = query.ilike("username", `%${search}%`);
  if (dateFrom) query = query.gte("analyzed_at", dateFrom);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: {
      total: count ?? 0,
      page,
      limit: PAGE_SIZE,
      totalPages,
    },
  });
}
