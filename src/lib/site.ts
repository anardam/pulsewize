export const SITE_NAME = "Pulsewize";
export const SITE_DESCRIPTION =
  "AI-powered social media analysis for Instagram, YouTube, and Facebook. Turn profile reads into growth strategy, competitor insight, and actionable next steps.";

export function getSiteUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000";

  const normalized = value.startsWith("http") ? value : `https://${value}`;
  return normalized.replace(/\/$/, "");
}
