import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export function GET() {
  const siteUrl = getSiteUrl();
  const body = [
    `# ${SITE_NAME}`,
    "",
    SITE_DESCRIPTION,
    "",
    "## Product",
    `- Homepage: ${siteUrl}/`,
    `- Signup: ${siteUrl}/signup`,
    `- Login: ${siteUrl}/login`,
    "",
    "## Summary",
    "- Pulsewize analyzes Instagram, YouTube, and Facebook profiles.",
    "- It generates growth strategy, competitor insight, and actionable recommendations.",
    "- Connected account workflows support official platform data for owned accounts.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
