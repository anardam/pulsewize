import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getConnectionProvider } from "@/lib/connections";
import { encryptConnectionToken } from "@/lib/connection-secrets";
import { createRequestId, logError, logInfo } from "@/lib/observability";

const STATE_COOKIE = "sociallens_twitter_oauth_state";
const VERIFIER_COOKIE = "sociallens_twitter_oauth_verifier";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(VERIFIER_COOKIE);
    return NextResponse.redirect(new URL("/settings?connection_error=invalid_state", request.url));
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(VERIFIER_COOKIE);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const provider = getConnectionProvider("twitter");
    const tokens = await provider.exchangeCode(code, codeVerifier);
    const identity = await provider.fetchAccount(tokens.accessToken);
    logInfo("twitter_connection_exchange_succeeded", {
      requestId,
      route: "twitter_callback",
      platform: "twitter",
      userId: user.id,
    });

    const upsertPayload = {
      user_id: user.id,
      platform: "twitter",
      external_account_id: identity.externalAccountId,
      username: identity.username ?? identity.externalAccountId,
      display_name: identity.displayName ?? identity.username ?? "X account",
      avatar_url: identity.avatarUrl ?? null,
      scopes: tokens.scopes,
      access_token: encryptConnectionToken(tokens.accessToken),
      refresh_token: encryptConnectionToken(tokens.refreshToken ?? null),
      token_expires_at: tokens.expiresAt ?? null,
      status: "active",
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: account, error: accountError } = await supabase
      .from("connected_accounts")
      .upsert(upsertPayload, {
        onConflict: "platform,external_account_id",
      })
      .select("id")
      .single();

    if (accountError || !account?.id) {
      throw new Error(accountError?.message ?? "Failed to save connected account");
    }

    const snapshot = await provider.fetchSnapshot(tokens.accessToken);

    const { error: snapshotError } = await supabase.from("account_snapshots").insert({
      connected_account_id: account.id,
      fetched_at: new Date().toISOString(),
      profile_data: snapshot.profileData,
      metrics_data: snapshot.metricsData,
    });

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }

    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(VERIFIER_COOKIE);
    return NextResponse.redirect(new URL("/dashboard?connected=twitter", request.url));
  } catch (error) {
    logError("twitter_connection_failed", error, {
      requestId,
      route: "twitter_callback",
      platform: "twitter",
      userId: user.id,
    });
    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(VERIFIER_COOKIE);
    const message = error instanceof Error ? error.message : "twitter_failed";
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("connection_error", "twitter_failed");
    redirectUrl.searchParams.set("connection_detail", message.slice(0, 180));
    return NextResponse.redirect(redirectUrl);
  }
}
