import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getConnectionProvider } from "@/lib/connections";
import { encryptConnectionToken } from "@/lib/connection-secrets";
import { createRequestId, logError, logInfo } from "@/lib/observability";

const STATE_COOKIE = "sociallens_instagram_oauth_state";
const ORIGIN_COOKIE = "sociallens_instagram_oauth_origin";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const expectedOrigin = cookieStore.get(ORIGIN_COOKIE)?.value;
  const origin = expectedOrigin ?? url.origin;

  if (!code || !state || !expectedState || state !== expectedState) {
    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(ORIGIN_COOKIE);
    return NextResponse.redirect(new URL("/settings?connection_error=invalid_state", origin));
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(ORIGIN_COOKIE);
    return NextResponse.redirect(new URL("/login", origin));
  }

  try {
    const provider = getConnectionProvider("instagram");
    const tokens = await provider.exchangeCode(code);
    const identity = await provider.fetchAccount(tokens.accessToken);
    logInfo("instagram_connection_exchange_succeeded", {
      requestId,
      route: "instagram_callback",
      platform: "instagram",
      userId: user.id,
    });

    const upsertPayload = {
      user_id: user.id,
      platform: "instagram",
      external_account_id: identity.externalAccountId,
      username: identity.username ?? identity.externalAccountId,
      display_name: identity.displayName ?? identity.username ?? "Instagram account",
      avatar_url: identity.avatarUrl ?? null,
      scopes: tokens.scopes,
      access_token: encryptConnectionToken(tokens.accessToken),
      refresh_token: encryptConnectionToken(tokens.accessToken),
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
    cookieStore.delete(ORIGIN_COOKIE);
    return NextResponse.redirect(new URL("/dashboard?connected=instagram", origin));
  } catch (error) {
    logError("instagram_connection_failed", error, {
      requestId,
      route: "instagram_callback",
      platform: "instagram",
      userId: user.id,
    });
    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(ORIGIN_COOKIE);
    const message =
      error instanceof Error ? error.message : "instagram_failed";
    const redirectUrl = new URL("/settings", origin);
    redirectUrl.searchParams.set("connection_error", "instagram_failed");
    redirectUrl.searchParams.set("connection_detail", message.slice(0, 180));
    return NextResponse.redirect(redirectUrl);
  }
}
