import { MetaConnectionProvider } from "@/lib/connections/meta";
import { TwitterConnectionProvider } from "@/lib/connections/twitter";
import { YouTubeConnectionProvider } from "@/lib/connections/youtube";
import type { ConnectedPlatform, ConnectionProvider } from "@/lib/connections/types";

export function getConnectionProvider(platform: ConnectedPlatform): ConnectionProvider {
  switch (platform) {
    case "youtube":
      return new YouTubeConnectionProvider();
    case "instagram":
      return new MetaConnectionProvider("instagram");
    case "facebook":
      return new MetaConnectionProvider("facebook");
    case "twitter":
      return new TwitterConnectionProvider();
    default:
      throw new Error(`Connection provider for ${platform} is not implemented yet`);
  }
}
