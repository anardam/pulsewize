import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// GET — list user's saved profiles
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("last_analyzed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

// POST — save a profile
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { platform, username, display_name } = body as {
    platform: string;
    username: string;
    display_name?: string;
  };

  if (!platform || !username) {
    return NextResponse.json({ success: false, error: "Platform and username required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_profiles")
    .upsert(
      {
        user_id: user.id,
        platform,
        username: username.trim(),
        display_name: display_name?.trim() || username.trim(),
        last_analyzed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform,username" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// DELETE — remove a saved profile
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ success: false, error: "Profile ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("saved_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
