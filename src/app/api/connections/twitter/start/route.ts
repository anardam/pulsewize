import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getConnectionProvider } from "@/lib/connections";
import {
  generatePkceChallenge,
  generatePkceVerifier,
} from "@/lib/connections/twitter";

const STATE_COOKIE = "sociallens_twitter_oauth_state";
const VERIFIER_COOKIE = "sociallens_twitter_oauth_verifier";

export async function GET(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();
  const verifier = generatePkceVerifier();
  const challenge = await generatePkceChallenge(verifier);
  const provider = getConnectionProvider("twitter");
  const authUrl = provider.getAuthorizationUrl(state, challenge);
  const cookieStore = await cookies();

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  cookieStore.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authUrl);
}
