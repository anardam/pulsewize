import type {
  ConnectionProvider,
  ProviderAccountIdentity,
  ProviderSnapshot,
  ProviderTokenBundle,
} from "@/lib/connections/types";
import type { RecentPost } from "@/lib/types";
import type { YouTubeProfile } from "@/lib/scrapers/types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

async function youtubeFetch<T>(
  path: string,
  accessToken: string,
  searchParams: Record<string, string>
): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

interface YouTubeChannelResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
  }>;
}

interface YouTubeThumbnailSet {
  default?: { url?: string };
  medium?: { url?: string };
  high?: { url?: string };
}

interface YouTubeSearchResponse {
  items?: Array<{
    id?: { videoId?: string };
  }>;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
    };
    statistics?: {
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

function asNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getThumbnailUrl(
  thumbnails?: YouTubeThumbnailSet
): string {
  return (
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    ""
  );
}

export class YouTubeConnectionProvider implements ConnectionProvider {
  getAuthorizationUrl(state: string): string {
    const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
    const redirectUri = getRequiredEnv("GOOGLE_OAUTH_REDIRECT_URI");
    const url = new URL(GOOGLE_AUTH_URL);

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
    url.searchParams.set("state", state);

    return url.toString();
  }

  async exchangeCode(code: string): Promise<ProviderTokenBundle> {
    const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
    const clientSecret = getRequiredEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri = getRequiredEnv("GOOGLE_OAUTH_REDIRECT_URI");

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google token exchange failed (${response.status}): ${body}`);
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
      scopes: data.scope ? data.scope.split(" ") : YOUTUBE_SCOPES,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokenBundle> {
    const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
    const clientSecret = getRequiredEnv("GOOGLE_CLIENT_SECRET");

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google token refresh failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in?: number;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
      scopes: data.scope ? data.scope.split(" ") : YOUTUBE_SCOPES,
    };
  }

  async fetchAccount(accessToken: string): Promise<ProviderAccountIdentity> {
    const channel = await this.fetchPrimaryChannel(accessToken);
    const snippet = channel.snippet ?? {};

    return {
      externalAccountId: channel.id,
      username: snippet.customUrl ?? channel.id,
      displayName: snippet.title ?? "YouTube Channel",
      avatarUrl: getThumbnailUrl(snippet.thumbnails),
    };
  }

  async fetchSnapshot(accessToken: string): Promise<ProviderSnapshot> {
    const channel = await this.fetchPrimaryChannel(accessToken);
    const snippet = channel.snippet ?? {};
    const statistics = channel.statistics ?? {};
    const recentPosts = await this.fetchRecentVideos(accessToken);

    const normalizedProfile: YouTubeProfile = {
      platform: "youtube",
      username: snippet.customUrl ?? channel.id,
      fullName: snippet.title ?? "YouTube Channel",
      biography: snippet.description ?? "",
      followersCount: asNumber(statistics.subscriberCount),
      followingCount: 0,
      postsCount: asNumber(statistics.videoCount),
      isVerified: false,
      profilePicUrl: getThumbnailUrl(snippet.thumbnails),
      externalUrl: snippet.customUrl
        ? `https://www.youtube.com/${snippet.customUrl}`
        : `https://www.youtube.com/channel/${channel.id}`,
      recentPosts,
      subscriberCountText: `${asNumber(statistics.subscriberCount).toLocaleString()} subscribers`,
      viewCount: asNumber(statistics.viewCount),
      channelId: channel.id,
    };

    return {
      normalizedProfile,
      profileData: {
        channelId: channel.id,
        title: snippet.title ?? "",
        description: snippet.description ?? "",
        customUrl: snippet.customUrl ?? null,
        thumbnails: snippet.thumbnails ?? {},
      },
      metricsData: {
        subscriberCount: asNumber(statistics.subscriberCount),
        videoCount: asNumber(statistics.videoCount),
        viewCount: asNumber(statistics.viewCount),
        recentVideos: recentPosts,
      },
    };
  }

  private async fetchPrimaryChannel(accessToken: string) {
    const data = await youtubeFetch<YouTubeChannelResponse>(
      "/channels",
      accessToken,
      {
        part: "snippet,statistics",
        mine: "true",
      }
    );

    const channel = data.items?.[0];
    if (!channel) {
      throw new Error("No YouTube channel found for this Google account");
    }

    return channel;
  }

  private async fetchRecentVideos(
    accessToken: string
  ): Promise<RecentPost[]> {
    const search = await youtubeFetch<YouTubeSearchResponse>(
      "/search",
      accessToken,
      {
        part: "id",
        forMine: "true",
        type: "video",
        order: "date",
        maxResults: "8",
      }
    );

    const videoIds = (search.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId));

    if (videoIds.length === 0) {
      return [];
    }

    const videos = await youtubeFetch<YouTubeVideosResponse>(
      "/videos",
      accessToken,
      {
        part: "snippet,statistics",
        id: videoIds.join(","),
        maxResults: String(videoIds.length),
      }
    );

    return (videos.items ?? []).map((video) => ({
      likes: asNumber(video.statistics?.likeCount),
      comments: asNumber(video.statistics?.commentCount),
      caption:
        video.snippet?.description?.trim() || video.snippet?.title?.trim() || undefined,
      timestamp: video.snippet?.publishedAt,
      isVideo: true,
    }));
  }
}
