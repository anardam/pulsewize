import type {
  ConnectionProvider,
  ProviderAccountIdentity,
  ProviderSnapshot,
  ProviderTokenBundle,
} from "@/lib/connections/types";
import type { TwitterProfile } from "@/lib/scrapers/types";
import type { RecentPost } from "@/lib/types";

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_USERS_ME_URL = "https://api.x.com/2/users/me";
const X_USER_POSTS_URL = "https://api.x.com/2/users";
const X_SCOPES = (process.env.X_SCOPES ?? "tweet.read users.read offline.access")
  .split(/\s+/)
  .filter(Boolean);

interface XPublicMetrics {
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
  like_count?: number;
}

interface XUserResponse {
  data?: {
    id: string;
    username?: string;
    name?: string;
    description?: string;
    verified?: boolean;
    profile_image_url?: string;
    url?: string;
    public_metrics?: XPublicMetrics;
  };
}

interface XTweetResponse {
  data?: Array<{
    id: string;
    text?: string;
    created_at?: string;
    public_metrics?: {
      like_count?: number;
      reply_count?: number;
      retweet_count?: number;
      quote_count?: number;
    };
  }>;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getRedirectUri(): string {
  return getRequiredEnv("X_OAUTH_REDIRECT_URI");
}

function encodeBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generatePkceVerifier(): string {
  return encodeBase64Url(Buffer.from(crypto.getRandomValues(new Uint8Array(32))));
}

export async function generatePkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return encodeBase64Url(Buffer.from(digest));
}

function trimProfileImage(url?: string): string | undefined {
  return url?.replace("_normal", "");
}

function toRecentPost(tweet: NonNullable<XTweetResponse["data"]>[number]): RecentPost {
  return {
    likes: tweet.public_metrics?.like_count ?? 0,
    comments: tweet.public_metrics?.reply_count ?? 0,
    caption: tweet.text?.trim() || undefined,
    timestamp: tweet.created_at,
    isVideo: false,
  };
}

async function xFetch<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export class TwitterConnectionProvider implements ConnectionProvider {
  private readonly clientId = getRequiredEnv("X_CLIENT_ID");

  getAuthorizationUrl(state: string, codeChallenge?: string): string {
    if (!codeChallenge) {
      throw new Error("X OAuth code challenge is required");
    }

    const url = new URL(X_AUTHORIZE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", getRedirectUri());
    url.searchParams.set("scope", X_SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier?: string): Promise<ProviderTokenBundle> {
    if (!codeVerifier) {
      throw new Error("X OAuth code verifier is required");
    }

    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: this.clientId,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    });

    const response = await fetch(X_TOKEN_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`X token exchange failed (${response.status}): ${bodyText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
      scopes: data.scope?.split(" ").filter(Boolean) ?? X_SCOPES,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokenBundle> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      client_id: this.clientId,
    });

    const response = await fetch(X_TOKEN_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`X token refresh failed (${response.status}): ${bodyText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
      scopes: data.scope?.split(" ").filter(Boolean) ?? X_SCOPES,
    };
  }

  async fetchAccount(accessToken: string): Promise<ProviderAccountIdentity> {
    const me = await this.fetchViewer(accessToken);

    return {
      externalAccountId: me.id,
      username: me.username ?? me.id,
      displayName: me.name ?? me.username ?? "X account",
      avatarUrl: trimProfileImage(me.profile_image_url),
    };
  }

  async fetchSnapshot(accessToken: string): Promise<ProviderSnapshot> {
    const me = await this.fetchViewer(accessToken);
    const recentTweets = await this.fetchTweets(accessToken, me.id);

    const normalizedProfile: TwitterProfile = {
      platform: "twitter",
      username: me.username ?? me.id,
      fullName: me.name ?? me.username ?? "X account",
      biography: me.description ?? "",
      followersCount: me.public_metrics?.followers_count ?? 0,
      followingCount: me.public_metrics?.following_count ?? 0,
      postsCount: me.public_metrics?.tweet_count ?? recentTweets.length,
      isVerified: Boolean(me.verified),
      profilePicUrl: trimProfileImage(me.profile_image_url) ?? "",
      externalUrl: me.url ?? (me.username ? `https://x.com/${me.username}` : undefined),
      recentPosts: recentTweets.map(toRecentPost),
      tweetsCount: me.public_metrics?.tweet_count ?? recentTweets.length,
      likesCount: me.public_metrics?.like_count ?? 0,
      isBlueVerified: Boolean(me.verified),
    };

    return {
      normalizedProfile,
      profileData: {
        id: me.id,
        username: me.username ?? "",
        name: me.name ?? "",
        description: me.description ?? "",
        profileImageUrl: trimProfileImage(me.profile_image_url) ?? "",
        url: me.url ?? "",
        verified: Boolean(me.verified),
      },
      metricsData: {
        publicMetrics: me.public_metrics ?? {},
        recentTweets,
      },
    };
  }

  private async fetchViewer(accessToken: string) {
    const url = new URL(X_USERS_ME_URL);
    url.searchParams.set(
      "user.fields",
      "description,profile_image_url,public_metrics,url,verified"
    );

    const response = await xFetch<XUserResponse>(url.toString(), accessToken);
    if (!response.data?.id) {
      throw new Error("X account identity was missing from /2/users/me");
    }

    return response.data;
  }

  private async fetchTweets(accessToken: string, userId: string) {
    const url = new URL(`${X_USER_POSTS_URL}/${userId}/tweets`);
    url.searchParams.set("max_results", "5");
    url.searchParams.set("exclude", "replies");
    url.searchParams.set("tweet.fields", "created_at,public_metrics,text");

    const response = await xFetch<XTweetResponse>(url.toString(), accessToken);
    return response.data ?? [];
  }
}
