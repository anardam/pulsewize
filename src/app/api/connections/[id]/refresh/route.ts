import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getConnectionProvider } from "@/lib/connections";
import type { ConnectedAccountRecord } from "@/lib/connections/types";
import {
  decryptConnectionToken,
  encryptConnectionToken,
} from "@/lib/connection-secrets";
import { createRequestId, logError, logInfo } from "@/lib/observability";

async function refreshAccount(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  account: ConnectedAccountRecord
) {
  const provider = getConnectionProvider(account.platform);

  let accessToken = decryptConnectionToken(account.access_token) ?? "";
  let expiresAt = account.token_expires_at;
  let scopes = account.scopes;
  const refreshToken = decryptConnectionToken(account.refresh_token);

  if (refreshToken) {
    const refreshed = await provider.refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    expiresAt = refreshed.expiresAt ?? expiresAt;
    scopes = refreshed.scopes.length > 0 ? refreshed.scopes : scopes;

    await supabase
      .from("connected_accounts")
      .update({
        access_token: encryptConnectionToken(accessToken),
        refresh_token: encryptConnectionToken(refreshed.refreshToken ?? refreshToken),
        token_expires_at: expiresAt,
        scopes,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
  }

  const snapshot = await provider.fetchSnapshot(accessToken);
  const now = new Date().toISOString();

  await supabase.from("account_snapshots").insert({
    connected_account_id: account.id,
    fetched_at: now,
    profile_data: snapshot.profileData,
    metrics_data: snapshot.metricsData,
  });

  await supabase
    .from("connected_accounts")
    .update({
      username: snapshot.normalizedProfile.username,
      display_name: snapshot.normalizedProfile.fullName,
      avatar_url: snapshot.normalizedProfile.profilePicUrl,
      last_synced_at: now,
      status: "active",
      updated_at: now,
    })
    .eq("id", account.id);

  return snapshot;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const requestId = createRequestId();
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

  const { data: account, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !account) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Connected account not found" },
      { status: 404 }
    );
  }

  try {
    const snapshot = await refreshAccount(supabase, account as ConnectedAccountRecord);
    logInfo("connected_account_refresh_succeeded", {
      requestId,
      route: "connection_refresh",
      platform: account.platform,
      userId: user.id,
      connectedAccountId: id,
    });
    return NextResponse.json({
      success: true,
      data: {
        normalizedProfile: snapshot.normalizedProfile,
        lastSyncedAt: new Date().toISOString(),
      },
    });
  } catch (refreshError) {
    const message =
      refreshError instanceof Error ? refreshError.message : "Refresh failed";
    logError("connected_account_refresh_failed", refreshError, {
      requestId,
      route: "connection_refresh",
      platform: account.platform,
      userId: user.id,
      connectedAccountId: id,
    });

    await supabase
      .from("connected_accounts")
      .update({
        status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
