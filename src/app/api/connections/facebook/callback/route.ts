import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getConnectionProvider } from "@/lib/connections";
import { encryptConnectionToken } from "@/lib/connection-secrets";
import { createRequestId, logError, logInfo } from "@/lib/observability";

const STATE_COOKIE = "sociallens_facebook_oauth_state";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    cookieStore.delete(STATE_COOKIE);
    return NextResponse.redirect(new URL("/settings?connection_error=invalid_state", request.url));
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cookieStore.delete(STATE_COOKIE);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const provider = getConnectionProvider("facebook");
    const tokens = await provider.exchangeCode(code);
    const identity = await provider.fetchAccount(tokens.accessToken);
    logInfo("facebook_connection_exchange_succeeded", {
      requestId,
      route: "facebook_callback",
      platform: "facebook",
      userId: user.id,
    });

    const upsertPayload = {
      user_id: user.id,
      platform: "facebook",
      external_account_id: identity.externalAccountId,
      username: identity.username ?? identity.externalAccountId,
      display_name: identity.displayName ?? identity.username ?? "Facebook page",
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
    return NextResponse.redirect(new URL("/dashboard?connected=facebook", request.url));
  } catch (error) {
    logError("facebook_connection_failed", error, {
      requestId,
      route: "facebook_callback",
      platform: "facebook",
      userId: user.id,
    });
    cookieStore.delete(STATE_COOKIE);
    const message =
      error instanceof Error ? error.message : "facebook_failed";
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("connection_error", "facebook_failed");
    redirectUrl.searchParams.set("connection_detail", message.slice(0, 180));
    return NextResponse.redirect(redirectUrl);
  }
}
