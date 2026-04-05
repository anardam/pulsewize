import type {
  ConnectedPlatform,
  ConnectionProvider,
  ProviderAccountIdentity,
  ProviderSnapshot,
  ProviderTokenBundle,
} from "@/lib/connections/types";
import type { FacebookProfile, InstagramProfile } from "@/lib/scrapers/types";
import type { RecentPost } from "@/lib/types";

const META_GRAPH_BASE = "https://graph.facebook.com/v22.0";
const META_OAUTH_BASE = "https://www.facebook.com/v22.0/dialog/oauth";
const INSTAGRAM_OAUTH_BASE = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_BASE = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com";

const META_SCOPES: Record<"instagram" | "facebook", string[]> = {
  instagram: [
    process.env.META_INSTAGRAM_SCOPES ?? "instagram_business_basic",
  ],
  facebook: [
    "public_profile",
    "pages_show_list",
    "business_management",
  ],
};

interface MetaPageAccount {
  id: string;
  name?: string;
  access_token?: string;
  about?: string;
  category?: string;
  link?: string;
  fan_count?: number;
  followers_count?: number;
  picture?: {
    data?: {
      url?: string;
    };
  };
  instagram_business_account?: {
    id: string;
    username?: string;
  };
}

interface MetaAccountsResponse {
  data?: MetaPageAccount[];
}

interface InstagramMediaResponse {
  data?: Array<{
    caption?: string;
    comments_count?: number;
    like_count?: number;
    media_type?: string;
    timestamp?: string;
  }>;
}

interface InstagramAccountResponse {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  website?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getInstagramClientId(): string {
  return (
    process.env.META_INSTAGRAM_APP_ID ??
    process.env.META_APP_ID ??
    getRequiredEnv("META_APP_ID")
  );
}

function getInstagramClientSecret(): string {
  return (
    process.env.META_INSTAGRAM_APP_SECRET ??
    process.env.META_APP_SECRET ??
    getRequiredEnv("META_APP_SECRET")
  );
}

function getRedirectUri(platform: "instagram" | "facebook"): string {
  return platform === "instagram"
    ? getRequiredEnv("META_INSTAGRAM_REDIRECT_URI")
    : getRequiredEnv("META_FACEBOOK_REDIRECT_URI");
}

async function metaFetch<T>(
  path: string,
  accessToken: string,
  searchParams: Record<string, string>
): Promise<T> {
  const url = new URL(`${META_GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function instagramFetch<T>(
  path: string,
  accessToken: string,
  searchParams: Record<string, string>
): Promise<T> {
  const url = new URL(`${INSTAGRAM_GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Instagram API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<ProviderTokenBundle> {
  const clientId = getRequiredEnv("META_APP_ID");
  const clientSecret = getRequiredEnv("META_APP_SECRET");
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);

  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta long-lived token exchange failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    scopes: [],
  };
}

function toRecentPost(media: {
  caption?: string;
  comments_count?: number;
  like_count?: number;
  media_type?: string;
  timestamp?: string;
}): RecentPost {
  return {
    likes: media.like_count ?? 0,
    comments: media.comments_count ?? 0,
    caption: media.caption?.trim() || undefined,
    timestamp: media.timestamp,
    isVideo: (media.media_type ?? "").toUpperCase().includes("VIDEO"),
  };
}

export class MetaConnectionProvider implements ConnectionProvider {
  constructor(private readonly platform: "instagram" | "facebook") {}

  getAuthorizationUrl(state: string): string {
    const clientId =
      this.platform === "instagram"
        ? getInstagramClientId()
        : getRequiredEnv("META_APP_ID");
    const redirectUri = getRedirectUri(this.platform);
    const url = new URL(
      this.platform === "instagram" ? INSTAGRAM_OAUTH_BASE : META_OAUTH_BASE
    );

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", META_SCOPES[this.platform].join(","));
    url.searchParams.set("state", state);
    if (this.platform === "instagram") {
      url.searchParams.set("force_reauth", "true");
    }

    return url.toString();
  }

  async exchangeCode(code: string): Promise<ProviderTokenBundle> {
    if (this.platform === "instagram") {
      return this.exchangeInstagramCode(code);
    }

    const clientId = getRequiredEnv("META_APP_ID");
    const clientSecret = getRequiredEnv("META_APP_SECRET");
    const redirectUri = getRedirectUri(this.platform);
    const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Meta token exchange failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      access_token: string;
    };

    const longLived = await exchangeForLongLivedToken(data.access_token);
    return {
      ...longLived,
      scopes: META_SCOPES[this.platform],
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokenBundle> {
    if (this.platform === "instagram") {
      return this.refreshInstagramAccessToken(refreshToken);
    }

    const refreshed = await exchangeForLongLivedToken(refreshToken);
    return {
      ...refreshed,
      scopes: META_SCOPES[this.platform],
    };
  }

  async fetchAccount(accessToken: string): Promise<ProviderAccountIdentity> {
    if (this.platform === "instagram") {
      const identity = await this.getInstagramAccount(accessToken);
      return {
        externalAccountId: identity.user_id ?? identity.id ?? identity.username ?? "instagram-account",
        username: identity.username ?? identity.user_id ?? identity.id ?? "instagram-account",
        displayName:
          identity.name ??
          identity.username ??
          "Instagram account",
        avatarUrl: identity.profile_picture_url ?? undefined,
      };
    }

    const page = await this.getFacebookPage(accessToken);
    return {
      externalAccountId: page.id,
      username: page.name ?? page.id,
      displayName: page.name ?? "Facebook page",
      avatarUrl: page.picture?.data?.url,
    };
  }

  async fetchSnapshot(accessToken: string): Promise<ProviderSnapshot> {
    if (this.platform === "instagram") {
      return this.fetchInstagramSnapshot(accessToken);
    }

    return this.fetchFacebookSnapshot(accessToken);
  }

  private async fetchInstagramSnapshot(accessToken: string): Promise<ProviderSnapshot> {
    const identity = await this.getInstagramAccount(accessToken);
    const media = await this.fetchInstagramMedia(accessToken);

    const normalizedProfile: InstagramProfile = {
      platform: "instagram",
      username: identity.username ?? identity.user_id ?? identity.id ?? "instagram-account",
      fullName:
        identity.name ??
        identity.username ??
        "Instagram account",
      biography: identity.biography ?? "",
      followersCount: identity.followers_count ?? 0,
      followingCount: identity.follows_count ?? 0,
      postsCount: identity.media_count ?? media.length,
      isPrivate: false,
      isVerified: false,
      profilePicUrl: identity.profile_picture_url ?? "",
      externalUrl: identity.website ?? `https://www.instagram.com/${identity.username ?? ""}`,
      recentPosts: media.map(toRecentPost),
    };

    return {
      normalizedProfile,
      profileData: {
        instagramId: identity.user_id ?? identity.id ?? "",
        username: identity.username ?? "",
        name: identity.name ?? "",
        biography: identity.biography ?? "",
        profilePictureUrl: identity.profile_picture_url ?? "",
      },
      metricsData: {
        followersCount: identity.followers_count ?? 0,
        followsCount: identity.follows_count ?? 0,
        mediaCount: identity.media_count ?? media.length,
        recentMedia: media,
      },
    };
  }

  private async fetchFacebookSnapshot(accessToken: string): Promise<ProviderSnapshot> {
    const page = await this.getFacebookPage(accessToken);
    const pageAccessToken = page.access_token ?? accessToken;
    const details = await this.fetchFacebookDetails(page.id, pageAccessToken, page);

    const recentPosts = (details.posts?.data ?? []).map((post) => ({
      likes: post.likes?.summary?.total_count ?? 0,
      comments: post.comments?.summary?.total_count ?? 0,
      caption: post.message?.trim() || undefined,
      timestamp: post.created_time,
      isVideo: false,
    }));

    const normalizedProfile: FacebookProfile = {
      platform: "facebook",
      username: page.name ?? page.id,
      fullName: details.name ?? page.name ?? "Facebook page",
      biography: details.about ?? "",
      followersCount: details.followers_count ?? details.fan_count ?? 0,
      followingCount: 0,
      postsCount: recentPosts.length,
      isVerified: false,
      profilePicUrl: details.picture?.data?.url ?? page.picture?.data?.url ?? "",
      externalUrl: details.link ?? undefined,
      recentPosts,
      likeCount: details.fan_count ?? 0,
      category: details.category,
    };

    return {
      normalizedProfile,
      profileData: {
        pageId: details.id ?? page.id,
        name: details.name ?? page.name ?? "",
        about: details.about ?? "",
        category: details.category ?? "",
        link: details.link ?? "",
      },
      metricsData: {
        followersCount: details.followers_count ?? details.fan_count ?? 0,
        likeCount: details.fan_count ?? 0,
        recentPosts,
      },
    };
  }

  private async getFacebookPage(accessToken: string): Promise<MetaPageAccount> {
    const accounts = await metaFetch<MetaAccountsResponse>("/me/accounts", accessToken, {
      fields: "id,name,access_token,about,category,link,fan_count,followers_count,picture{url}",
    });

    const page = accounts.data?.[0];
    if (!page) {
      throw new Error("No Facebook pages found for this account");
    }

    return page;
  }

  private async getInstagramAccount(accessToken: string): Promise<InstagramAccountResponse> {
    try {
      return await instagramFetch<InstagramAccountResponse>("/me", accessToken, {
        fields:
          "user_id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website",
      });
    } catch {
      return instagramFetch<InstagramAccountResponse>("/me", accessToken, {
        fields: "user_id,username",
      });
    }
  }

  private async fetchInstagramMedia(accessToken: string) {
    try {
      const response = await instagramFetch<InstagramMediaResponse>("/me/media", accessToken, {
        fields: "caption,comments_count,like_count,media_type,timestamp",
        limit: "8",
      });
      return response.data ?? [];
    } catch {
      return [];
    }
  }

  private async fetchFacebookDetails(
    pageId: string,
    pageAccessToken: string,
    page: MetaPageAccount
  ) {
    try {
      return await metaFetch<{
        id?: string;
        username?: string;
        name?: string;
        about?: string;
        category?: string;
        link?: string;
        fan_count?: number;
        followers_count?: number;
        picture?: { data?: { url?: string } };
        posts?: {
          data?: Array<{
            message?: string;
            created_time?: string;
            likes?: { summary?: { total_count?: number } };
            comments?: { summary?: { total_count?: number } };
          }>;
        };
      }>(`/${pageId}`, pageAccessToken, {
        fields: "id,name,about,category,link,fan_count,followers_count,picture{url},posts.limit(8){message,created_time,likes.summary(true),comments.summary(true)}",
      });
    } catch {
      return {
        id: page.id,
        name: page.name,
        about: page.about,
        category: page.category,
        link: page.link,
        fan_count: page.fan_count,
        followers_count: page.followers_count,
        picture: page.picture,
        posts: {
          data: [],
        },
      };
    }
  }

  private async exchangeInstagramCode(code: string): Promise<ProviderTokenBundle> {
    const clientId = getInstagramClientId();
    const clientSecret = getInstagramClientSecret();
    const redirectUri = getRedirectUri("instagram");

    const response = await fetch(INSTAGRAM_TOKEN_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Instagram token exchange failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      access_token: string;
    };

    const url = new URL(`${INSTAGRAM_GRAPH_BASE}/access_token`);
    url.searchParams.set("grant_type", "ig_exchange_token");
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("access_token", data.access_token);

    const longLivedResponse = await fetch(url, { cache: "no-store" });
    if (!longLivedResponse.ok) {
      const body = await longLivedResponse.text();
      throw new Error(`Instagram long-lived token exchange failed (${longLivedResponse.status}): ${body}`);
    }

    const longLivedData = (await longLivedResponse.json()) as {
      access_token: string;
      expires_in?: number;
    };

    return {
      accessToken: longLivedData.access_token,
      refreshToken: longLivedData.access_token,
      expiresAt: longLivedData.expires_in
        ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
        : undefined,
      scopes: META_SCOPES.instagram,
    };
  }

  private async refreshInstagramAccessToken(refreshToken: string): Promise<ProviderTokenBundle> {
    const clientSecret = getInstagramClientSecret();
    const url = new URL(`${INSTAGRAM_GRAPH_BASE}/refresh_access_token`);
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", refreshToken);
    url.searchParams.set("client_secret", clientSecret);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Instagram token refresh failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
      scopes: META_SCOPES.instagram,
    };
  }
}

export function isMetaPlatform(platform: ConnectedPlatform): platform is "instagram" | "facebook" {
  return platform === "instagram" || platform === "facebook";
}
