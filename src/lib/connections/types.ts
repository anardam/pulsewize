import type { NormalizedProfile } from "@/lib/scrapers/types";

export type ConnectedPlatform =
  | "youtube"
  | "instagram"
  | "facebook"
  | "twitter"
  | "tiktok";

export interface ConnectedAccountRecord {
  id: string;
  user_id: string;
  platform: ConnectedPlatform;
  external_account_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  scopes: string[];
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: "active" | "expired" | "revoked" | "error";
  connected_at: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountSnapshotRecord {
  id?: string;
  connected_account_id: string;
  fetched_at: string;
  profile_data: Record<string, unknown>;
  metrics_data: Record<string, unknown>;
}

export interface ConnectedAccountSummary {
  id: string;
  platform: ConnectedPlatform;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: ConnectedAccountRecord["status"];
  connectedAt: string;
  lastSyncedAt: string | null;
}

export interface ProviderTokenBundle {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes: string[];
}

export interface ProviderAccountIdentity {
  externalAccountId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface ProviderSnapshot {
  normalizedProfile: NormalizedProfile;
  profileData: Record<string, unknown>;
  metricsData: Record<string, unknown>;
}

export interface ConnectionProvider {
  getAuthorizationUrl(state: string, verifierOrChallenge?: string): string;
  exchangeCode(code: string, verifier?: string): Promise<ProviderTokenBundle>;
  refreshAccessToken(refreshToken: string): Promise<ProviderTokenBundle>;
  fetchAccount(accessToken: string): Promise<ProviderAccountIdentity>;
  fetchSnapshot(accessToken: string): Promise<ProviderSnapshot>;
}
