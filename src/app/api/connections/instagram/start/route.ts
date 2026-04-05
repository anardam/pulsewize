import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getConnectionProvider } from "@/lib/connections";

const STATE_COOKIE = "sociallens_instagram_oauth_state";

export async function GET(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();
  const provider = getConnectionProvider("instagram");
  const authUrl = provider.getAuthorizationUrl(state);
  const cookieStore = await cookies();
  const requestOrigin = new URL(request.url).origin;

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  cookieStore.set("sociallens_instagram_oauth_origin", requestOrigin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authUrl);
}
