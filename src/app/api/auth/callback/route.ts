// src/app/api/auth/callback/route.ts
// Exchanges the OAuth code from Google for a Supabase session.
// Required for Google OAuth to work in Next.js App Router.
// Supabase redirects to this URL after the user approves Google sign-in.
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // OAuth failed — redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
