/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tesserix/web", "@tesserix/tokens"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "graph.facebook.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "**.fbsbx.com",
      },
    ],
  },
};

export default nextConfig;
