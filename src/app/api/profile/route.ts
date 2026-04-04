import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

interface ProfileUpdateBody {
  display_name?: string;
  avatar_url?: string;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  const body = (await request.json()) as ProfileUpdateBody;

  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.display_name === "string") {
    updates.display_name = body.display_name.trim().slice(0, 64);
  }
  if (typeof body.avatar_url === "string") {
    updates.avatar_url = body.avatar_url;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
