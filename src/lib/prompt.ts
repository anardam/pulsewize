import type { NormalizedProfile } from "@/lib/scrapers/types";
import type { ManualProfileInput } from "@/lib/types";
import { NlpResult } from "./nlp";
import { TrendResult } from "./trends";

export function buildAnalysisPrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const platform = "platform" in profileData ? profileData.platform : "instagram";

  switch (platform) {
    case "youtube":  return buildYouTubePrompt(profileData, nlpResult, trendResult);
    case "twitter":  return buildTwitterPrompt(profileData, nlpResult, trendResult);
    case "tiktok":   return buildTikTokPrompt(profileData, nlpResult, trendResult);
    case "linkedin": return buildLinkedInPrompt(profileData, nlpResult, trendResult);
    case "facebook": return buildFacebookPrompt(profileData, nlpResult, trendResult);
    default:         return buildInstagramPrompt(profileData, nlpResult, trendResult);
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function buildNlpSection(nlpResult?: NlpResult | null): string {
  if (!nlpResult || (nlpResult.themes.length === 0 && nlpResult.keywords.length === 0)) {
    return "";
  }
  return `

NLP ANALYSIS OF CONTENT:
- Extracted Themes: ${nlpResult.themes.join(", ")}
- Top Keywords: ${nlpResult.keywords.join(", ")}
- Average Content Sentiment: ${nlpResult.sentimentLabel} (score: ${nlpResult.sentimentScore}/100)

Use these NLP-extracted themes and keywords to make your content pillar and strategy recommendations more specific and grounded in what this creator actually talks about.`;
}

function buildTrendSection(trendResult?: TrendResult | null): string {
  if (!trendResult) return "";
  return `

NICHE TREND DATA:
- Primary Niche Keyword: "${trendResult.keyword}"
- Trend Direction (last 90 days): ${trendResult.direction.toUpperCase()}

Factor this trend direction into your growth potential score and roadmap recommendations. If the niche is rising, lean into it aggressively. If declining, suggest diversification strategies.`;
}

// ─── Instagram ─────────────────────────────────────────────────────────────────

function buildInstagramPrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const dataStr = JSON.stringify(profileData, null, 2);
  const nlpSection = buildNlpSection(nlpResult);
  const trendSection = buildTrendSection(trendResult);

  return `You are an expert Instagram growth strategist. Analyze this profile and return actionable, specific recommendations. Do NOT give vague advice — every recommendation must include EXACT steps the user can do right now.

PROFILE DATA:
${dataStr}${nlpSection}${trendSection}

CRITICAL INSTRUCTION: Be extremely specific and actionable. Bad example: "Rewrite your bio to be clearer". Good example: "Change your bio to: '🎬 Actor & Model | NYC + LA | Netflix • Hulu • NBC | Book me: link.to/casting' — this format shows markets, credits, and a CTA in one glance."

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "profileScore": {
    "overall": <number 0-100>,
    "breakdown": {
      "contentQuality": <number 0-100>,
      "engagement": <number 0-100>,
      "consistency": <number 0-100>,
      "growthPotential": <number 0-100>,
      "brandValue": <number 0-100>
    }
  },
  "engagementStats": {
    "rate": <number as percentage>,
    "avgLikes": <number>,
    "avgComments": <number>,
    "likesToCommentsRatio": <number>,
    "estimatedReach": <number>
  },
  "strengthsWeaknesses": {
    "strengths": [<3-5 specific strings>],
    "weaknesses": [<3-5 specific strings with what to fix>]
  },
  "bioRewrite": "<write the EXACT new bio they should copy-paste, max 150 chars, with emojis and line breaks as \\n>",
  "contentPillars": [
    {
      "name": "<pillar name>",
      "description": "<brief description>",
      "contentIdeas": [<3 SPECIFIC post ideas with exact captions or hooks they can use>]
    }
  ],
  "postingStrategy": {
    "currentFrequency": "<estimated current posting frequency>",
    "recommendedFrequency": "<recommended frequency>",
    "bestTimes": [{"day": "<day>", "time": "<time in format like 9:00 AM EST>"}],
    "bestFormats": [<recommended content formats>]
  },
  "hashtags": {
    "niche": [<10 niche-specific hashtags with #>],
    "midTier": [<10 mid-tier hashtags with #>],
    "broad": [<10 broad hashtags with #>]
  },
  "roadmap": [
    {
      "phase": "Week 1",
      "timeframe": "Days 1-7",
      "goals": [<2-3 measurable goals like 'Post 5 Reels' not vague like 'increase engagement'>],
      "actions": [<5 specific daily actions like 'Day 1: Update bio to... Day 2: Create a Reel about...'>],
      "expectedOutcome": "<specific measurable outcome like 'Gain 50-100 new followers'>"
    },
    {
      "phase": "Month 1",
      "timeframe": "Days 1-30",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 3",
      "timeframe": "Days 1-90",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    }
  ],
  "quickWins": [
    {
      "action": "<something they can do in under 5 minutes>",
      "why": "<why this matters>",
      "howTo": "<exact step-by-step: go to Settings > ... > change X to Y>"
    }
  ],
  "actionItems": [
    {
      "rank": <1-10>,
      "action": "<short action title>",
      "description": "<what this achieves and why it matters>",
      "steps": [<3-5 exact steps like 'Open Instagram > Edit Profile > Change bio to: ...' or 'Record a 15s video showing...' — be specific enough that a beginner can follow>],
      "impact": "<High|Medium|Low>",
      "effort": "<High|Medium|Low>",
      "category": "<category>",
      "timeline": "<when to do this, e.g. 'Today' or 'This week' or 'Ongoing'>"
    }
  ],
  "competitorInsights": [
    {
      "tactic": "<what successful accounts in this niche do>",
      "description": "<specific example of the tactic>",
      "howToApply": "<exact steps to replicate this>"
    }
  ],
  "contentCalendar": [
    {
      "day": "Monday",
      "contentType": "<Reel|Carousel|Story|Post>",
      "topic": "<specific topic>",
      "caption": "<a ready-to-use caption or hook they can copy>",
      "hashtags": "<5 relevant hashtags>"
    }
  ],
  "monetisation": {
    "readinessScore": <number 0-100>,
    "currentTier": "<Nano|Micro|Mid-Tier|Macro|Mega>",
    "potentialRevenue": "<estimated monthly revenue range>",
    "opportunities": [<3-5 specific monetisation opportunities with platform names and steps>],
    "requirements": [<what's needed, be specific like 'Reach 10K followers to unlock swipe-up links'>],
    "nextMilestone": "<the next follower/engagement milestone and what it unlocks>"
  }
}

Provide 3-4 content pillars, 5 quick wins, exactly 10 action items, 3 competitor insights, and a 7-day content calendar. Every recommendation must be specific to this profile's niche. Return ONLY the JSON.`;
}

// ─── YouTube ───────────────────────────────────────────────────────────────────

function buildYouTubePrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const dataStr = JSON.stringify(profileData, null, 2);
  const nlpSection = buildNlpSection(nlpResult);
  const trendSection = buildTrendSection(trendResult);

  return `You are an expert YouTube channel growth strategist and video SEO specialist. Analyze this channel and return actionable, specific recommendations. Do NOT give vague advice — every recommendation must include EXACT steps the creator can do right now.

CHANNEL DATA:
${dataStr}${nlpSection}${trendSection}

CRITICAL INSTRUCTION: Be extremely specific and actionable. Bad example: "Improve your thumbnails". Good example: "Change your thumbnails to use a split-face close-up in the top-left, bold 3-word title in Impact font at 72pt in yellow with black stroke, and a contrasting background color — mirroring the format used by MrBeast and Marques Brownlee in their top-performing videos."

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "profileScore": {
    "overall": <number 0-100>,
    "breakdown": {
      "contentQuality": <number 0-100>,
      "engagement": <number 0-100>,
      "consistency": <number 0-100>,
      "growthPotential": <number 0-100>,
      "brandValue": <number 0-100>
    }
  },
  "engagementStats": {
    "rate": <number as percentage>,
    "avgLikes": <number>,
    "avgComments": <number>,
    "likesToCommentsRatio": <number>,
    "estimatedReach": <number>
  },
  "strengthsWeaknesses": {
    "strengths": [<3-5 specific strings>],
    "weaknesses": [<3-5 specific strings with what to fix>]
  },
  "bioRewrite": "<write the EXACT new channel description they should copy-paste, max 200 chars, covering niche, upload schedule, and a CTA>",
  "contentPillars": [
    {
      "name": "<pillar name>",
      "description": "<brief description>",
      "contentIdeas": [<3 SPECIFIC video ideas with exact titles and opening hook scripts they can use>]
    }
  ],
  "videoSEO": {
    "titleFormula": "<exact title formula with example, e.g. '[Number] [Adjective] [Niche] Tips That [Outcome] — example: 5 Underrated Photography Tips That Doubled My Views'>",
    "descriptionTemplate": "<a ready-to-use description template with placeholder sections for timestamp chapters, affiliate links, and social links>",
    "tagsStrategy": "<exact list of 15-20 tags to use, mixing channel-brand tags, niche tags, and trend tags>"
  },
  "thumbnailStrategy": {
    "style": "<specific visual style description with reference creators who use it successfully>",
    "colorScheme": "<exact hex colors or color names to use for background, text, and accent>",
    "textOverlay": "<exact rules: max word count, font style, placement, size relative to face or object>"
  },
  "uploadStrategy": {
    "currentFrequency": "<estimated current upload frequency>",
    "recommendedFrequency": "<recommended frequency with reasoning>",
    "bestTimes": [{"day": "<day>", "time": "<time in format like 9:00 AM EST>"}],
    "videoFormats": ["Shorts (under 60s)", "Long-form (8-20 min)", "Livestream", "Series episodes"]
  },
  "roadmap": [
    {
      "phase": "Week 1",
      "timeframe": "Days 1-7",
      "goals": [<2-3 measurable goals like 'Optimize 5 existing video titles and thumbnails'>],
      "actions": [<5 specific daily actions>],
      "expectedOutcome": "<specific measurable outcome like 'Increase CTR from 3% to 6% on optimized videos'>"
    },
    {
      "phase": "Month 1",
      "timeframe": "Days 1-30",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 3",
      "timeframe": "Days 1-90",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    }
  ],
  "quickWins": [
    {
      "action": "<something they can do in under 5 minutes>",
      "why": "<why this matters for YouTube growth>",
      "howTo": "<exact step-by-step: go to YouTube Studio > ... > change X to Y>"
    }
  ],
  "actionItems": [
    {
      "rank": <1-10>,
      "action": "<short action title>",
      "description": "<what this achieves and why it matters>",
      "steps": [<3-5 exact steps specific enough for a beginner to follow>],
      "impact": "<High|Medium|Low>",
      "effort": "<High|Medium|Low>",
      "category": "<category>",
      "timeline": "<when to do this>"
    }
  ],
  "competitorInsights": [
    {
      "tactic": "<what successful channels in this niche do>",
      "description": "<specific example of the tactic with named channel>",
      "howToApply": "<exact steps to replicate this>"
    }
  ],
  "contentCalendar": [
    {
      "day": "Monday",
      "contentType": "<Long-form|Short|Livestream|Community Post>",
      "topic": "<specific video topic>",
      "titleHook": "<a ready-to-use video title with strong click incentive>",
      "openingHook": "<first 15 seconds script — the hook that keeps viewers watching>"
    }
  ],
  "monetisation": {
    "readinessScore": <number 0-100>,
    "currentTier": "<Pre-monetisation|YPP Eligible|Mid-Tier|Large Channel>",
    "potentialRevenue": "<estimated monthly revenue range from AdSense + sponsorships>",
    "opportunities": [<3-5 specific revenue streams with exact steps: AdSense, channel memberships, merchandise, sponsorships, courses>],
    "requirements": [<what's needed, e.g. 'Reach 1,000 subscribers and 4,000 watch hours for YPP eligibility'>],
    "nextMilestone": "<the next subscriber/watch-hour milestone and what it unlocks>"
  }
}

Provide 3-4 content pillars, 5 quick wins, exactly 10 action items, 3 competitor insights, and a 7-day upload schedule content calendar. Every recommendation must be specific to this channel's niche. Return ONLY the JSON.`;
}

// ─── Twitter / X ───────────────────────────────────────────────────────────────

function buildTwitterPrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const dataStr = JSON.stringify(profileData, null, 2);
  const nlpSection = buildNlpSection(nlpResult);
  const trendSection = buildTrendSection(trendResult);

  return `You are an expert Twitter/X growth and engagement strategist. Analyze this profile and return actionable, specific recommendations. Do NOT give vague advice — every recommendation must include EXACT steps the user can do right now.

PROFILE DATA:
${dataStr}${nlpSection}${trendSection}

CRITICAL INSTRUCTION: Be extremely specific and actionable. Bad example: "Post more consistently". Good example: "Post one thread every Tuesday at 8:00 AM EST using this hook formula: '[Controversial statement about your niche]. Here's what 99% of people get wrong: 🧵' — then follow with 7 insight tweets and end with a CTA to follow."

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "profileScore": {
    "overall": <number 0-100>,
    "breakdown": {
      "contentQuality": <number 0-100>,
      "engagement": <number 0-100>,
      "consistency": <number 0-100>,
      "growthPotential": <number 0-100>,
      "brandValue": <number 0-100>
    }
  },
  "engagementStats": {
    "rate": <number as percentage>,
    "avgLikes": <number>,
    "avgComments": <number>,
    "likesToCommentsRatio": <number>,
    "estimatedReach": <number>
  },
  "strengthsWeaknesses": {
    "strengths": [<3-5 specific strings>],
    "weaknesses": [<3-5 specific strings with what to fix>]
  },
  "bioRewrite": "<write the EXACT new bio they should copy-paste, max 160 chars, using Twitter bio best practices: what you do, social proof, and a clear value proposition>",
  "contentPillars": [
    {
      "name": "<pillar name>",
      "description": "<brief description>",
      "contentIdeas": [<3 SPECIFIC tweet or thread ideas with exact opening hooks they can use>]
    }
  ],
  "threadStrategy": {
    "optimalLength": "<ideal thread length in tweets with reasoning, e.g. '7-10 tweets — long enough for substance, short enough to retain readers'>",
    "hookFormulas": [<3 proven hook formulas with fill-in-the-blank templates specific to this niche>],
    "replyStrategy": "<exact approach to replies: how to engage influencers, when to reply, what kinds of replies drive followers>",
    "quoteTweetApproach": "<how to use quote tweets to add commentary and grow — specific types of content to QT>"
  },
  "postingStrategy": {
    "currentFrequency": "<estimated current posting frequency>",
    "recommendedFrequency": "<recommended frequency — tweets per day + threads per week>",
    "bestTimes": [{"day": "<day>", "time": "<time in format like 9:00 AM EST>"}],
    "bestFormats": [<recommended content formats: threads, single tweets, polls, spaces, etc.>]
  },
  "hashtags": {
    "niche": [<5 niche-specific hashtags with #>],
    "trending": [<5 currently trending relevant hashtags — note these change; use for discoverability>],
    "broad": [<5 broad hashtags with #>]
  },
  "roadmap": [
    {
      "phase": "Week 1",
      "timeframe": "Days 1-7",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific daily actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 1",
      "timeframe": "Days 1-30",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 3",
      "timeframe": "Days 1-90",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    }
  ],
  "quickWins": [
    {
      "action": "<something they can do in under 5 minutes>",
      "why": "<why this matters for Twitter growth>",
      "howTo": "<exact step-by-step>"
    }
  ],
  "actionItems": [
    {
      "rank": <1-10>,
      "action": "<short action title>",
      "description": "<what this achieves and why it matters>",
      "steps": [<3-5 exact steps specific enough for a beginner to follow>],
      "impact": "<High|Medium|Low>",
      "effort": "<High|Medium|Low>",
      "category": "<category>",
      "timeline": "<when to do this>"
    }
  ],
  "competitorInsights": [
    {
      "tactic": "<what successful Twitter accounts in this niche do>",
      "description": "<specific example with named account>",
      "howToApply": "<exact steps to replicate this>"
    }
  ],
  "monetisation": {
    "readinessScore": <number 0-100>,
    "currentTier": "<Micro|Growing|Established|Large>",
    "potentialRevenue": "<estimated monthly revenue range>",
    "opportunities": [<3-5 specific revenue streams: X subscriptions, newsletters, sponsored tweets, consulting, digital products>],
    "requirements": [<what's needed for each revenue stream>],
    "nextMilestone": "<the next follower milestone and what it unlocks>"
  }
}

Provide 3-4 content pillars, 5 quick wins, exactly 10 action items, and 3 competitor insights. Twitter is real-time — no content calendar needed; focus on the thread strategy and posting cadence instead. Every recommendation must be specific to this profile's niche. Return ONLY the JSON.`;
}

// ─── TikTok ────────────────────────────────────────────────────────────────────

function buildTikTokPrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const dataStr = JSON.stringify(profileData, null, 2);
  const nlpSection = buildNlpSection(nlpResult);
  const trendSection = buildTrendSection(trendResult);

  return `You are an expert TikTok viral content and growth strategist. Analyze this profile and return actionable, specific recommendations. Do NOT give vague advice — every recommendation must include EXACT steps the creator can do right now.

PROFILE DATA:
${dataStr}${nlpSection}${trendSection}

CRITICAL INSTRUCTION: Be extremely specific and actionable. Bad example: "Use trending sounds". Good example: "Go to TikTok Discover > Sounds > filter by 'Rising' — use the #1 trending sound in your niche within the first 3 days of it trending (after day 5 it's saturated). Film a 7-second hook using the sound's beat drop as your visual transition point."

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "profileScore": {
    "overall": <number 0-100>,
    "breakdown": {
      "contentQuality": <number 0-100>,
      "engagement": <number 0-100>,
      "consistency": <number 0-100>,
      "growthPotential": <number 0-100>,
      "brandValue": <number 0-100>
    }
  },
  "engagementStats": {
    "rate": <number as percentage>,
    "avgLikes": <number>,
    "avgComments": <number>,
    "likesToCommentsRatio": <number>,
    "estimatedReach": <number>
  },
  "strengthsWeaknesses": {
    "strengths": [<3-5 specific strings>],
    "weaknesses": [<3-5 specific strings with what to fix>]
  },
  "bioRewrite": "<write the EXACT new bio they should copy-paste, max 80 chars, TikTok bio best practice: niche + hook + CTA in one line>",
  "contentPillars": [
    {
      "name": "<pillar name>",
      "description": "<brief description>",
      "contentIdeas": [<3 SPECIFIC video ideas with exact opening hooks and videoHooks for the first 3 seconds>]
    }
  ],
  "trendingAngles": {
    "currentTrends": [<3 specific TikTok trends or formats (e.g. 'POV videos', 'Day in my life', 'Storytime') that apply to this niche>],
    "soundStrategy": "<specific advice on sound selection: how often to use trending sounds vs original audio, and where to find rising sounds before they peak>",
    "duetStitchOpportunities": "<types of videos in this niche to duet or stitch for views — describe the strategy and give 2 example approaches>",
    "forYouPageSignals": "<the 3 most important FYP signals to optimise for this specific niche: watch time cues, comment bait, share triggers>"
  },
  "postingStrategy": {
    "currentFrequency": "<estimated current posting frequency>",
    "recommendedFrequency": "<recommended frequency — minimum posts per day for algorithm momentum>",
    "bestTimes": [{"day": "<day>", "time": "<time in format like 9:00 AM EST>"}],
    "bestFormats": [<recommended video lengths and styles: 7s hook-only, 15s tutorial, 30s story, 60s deep-dive, etc.>]
  },
  "hashtags": {
    "niche": [<8 niche-specific hashtags with #>],
    "trending": [<5 trending hashtags for discoverability — note these change fast>],
    "broad": [<5 broad hashtags with #>]
  },
  "roadmap": [
    {
      "phase": "Week 1",
      "timeframe": "Days 1-7",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific daily actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 1",
      "timeframe": "Days 1-30",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 3",
      "timeframe": "Days 1-90",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    }
  ],
  "quickWins": [
    {
      "action": "<something they can do in under 5 minutes>",
      "why": "<why this matters for TikTok growth>",
      "howTo": "<exact step-by-step>"
    }
  ],
  "actionItems": [
    {
      "rank": <1-10>,
      "action": "<short action title>",
      "description": "<what this achieves and why it matters>",
      "steps": [<3-5 exact steps specific enough for a beginner to follow>],
      "impact": "<High|Medium|Low>",
      "effort": "<High|Medium|Low>",
      "category": "<category>",
      "timeline": "<when to do this>"
    }
  ],
  "competitorInsights": [
    {
      "tactic": "<what viral TikTok accounts in this niche do>",
      "description": "<specific example of the tactic>",
      "howToApply": "<exact steps to replicate this>"
    }
  ],
  "contentCalendar": [
    {
      "day": "Monday",
      "contentType": "<Hook video|Tutorial|Trend|Duet|Story|POV>",
      "topic": "<specific video topic>",
      "openingHook": "<exact first 3 seconds script — the hook that stops the scroll>",
      "hashtags": "<5 relevant hashtags>"
    }
  ],
  "monetisation": {
    "readinessScore": <number 0-100>,
    "currentTier": "<Emerging|Growing|Creator Fund Eligible|Brand Deal Ready>",
    "potentialRevenue": "<estimated monthly revenue range>",
    "opportunities": [<3-5 specific revenue streams: TikTok Creator Fund, brand deals, TikTok Shop, live gifts, Patreon>],
    "requirements": [<what's needed, e.g. 'Reach 10K followers for Creator Fund eligibility'>],
    "nextMilestone": "<the next follower/heart milestone and what it unlocks>"
  }
}

Provide 3-4 content pillars, 5 quick wins, exactly 10 action items, 3 competitor insights, and a 7-day content calendar. Every recommendation must be specific to this profile's niche. Return ONLY the JSON.`;
}

// ─── LinkedIn ──────────────────────────────────────────────────────────────────

function buildLinkedInPrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const dataStr = JSON.stringify(profileData, null, 2);
  const nlpSection = buildNlpSection(nlpResult);
  const trendSection = buildTrendSection(trendResult);

  return `You are an expert LinkedIn professional brand and thought leadership strategist. Analyze this profile and return actionable, specific recommendations. Do NOT give vague advice — every recommendation must include EXACT steps the user can do right now.

PROFILE DATA:
${dataStr}${nlpSection}${trendSection}

CRITICAL INSTRUCTION: Be extremely specific and actionable. Bad example: "Optimise your headline". Good example: "Change your headline from 'Software Engineer at Acme Corp' to 'Senior Software Engineer | Helping startups ship 3x faster with clean architecture | Ex-Google | 10K+ followers' — this format shows expertise, the value you deliver, your credibility, and social proof in one line."

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "profileScore": {
    "overall": <number 0-100>,
    "breakdown": {
      "contentQuality": <number 0-100>,
      "engagement": <number 0-100>,
      "consistency": <number 0-100>,
      "growthPotential": <number 0-100>,
      "brandValue": <number 0-100>
    }
  },
  "engagementStats": {
    "rate": <number as percentage>,
    "avgLikes": <number>,
    "avgComments": <number>,
    "likesToCommentsRatio": <number>,
    "estimatedReach": <number>
  },
  "strengthsWeaknesses": {
    "strengths": [<3-5 specific strings>],
    "weaknesses": [<3-5 specific strings with what to fix>]
  },
  "bioRewrite": "<write the EXACT new LinkedIn headline they should copy-paste, max 220 chars: role + value delivered + credibility signal + social proof>",
  "contentPillars": [
    {
      "name": "<pillar name>",
      "description": "<brief description>",
      "contentIdeas": [<3 SPECIFIC post ideas with exact opening hooks they can use>]
    }
  ],
  "thoughtLeadership": {
    "postTypes": [<4 specific post types that drive authority in this niche: e.g. 'Lessons learned from X failures', 'Hot take on industry norm', 'Step-by-step breakdown of a win'>],
    "topicAuthority": "<the 2-3 specific topics this person should own and be the go-to source for — based on their profile data>",
    "engagementTactics": "<exact tactics to drive high-quality comments: the specific types of questions to ask, how to end posts with a CTA that professionals actually respond to>"
  },
  "connectionStrategy": {
    "targetAudience": "<exact description of ideal connections: job title, industry, company size, seniority level>",
    "outreachApproach": "<exact connection request message template — max 300 chars, personalized formula>",
    "networkingGoals": "<specific networking goals for the next 90 days: number of connections, types of relationships to build, events or groups to join>"
  },
  "contentMix": {
    "textPosts": "<percentage and strategy — when to use text-only posts and what topics perform best>",
    "documentPosts": "<percentage and strategy — when to use PDF carousels and what formats convert best>",
    "polls": "<percentage and strategy — types of polls that drive engagement in this niche>",
    "videoContent": "<percentage and strategy — native video vs external link, ideal length, topic types>"
  },
  "postingStrategy": {
    "currentFrequency": "<estimated current posting frequency>",
    "recommendedFrequency": "<recommended frequency with day-by-day guide>",
    "bestTimes": [{"day": "<day>", "time": "<time in format like 8:00 AM EST>"}],
    "bestFormats": [<recommended content formats>]
  },
  "roadmap": [
    {
      "phase": "Week 1",
      "timeframe": "Days 1-7",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific daily actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 1",
      "timeframe": "Days 1-30",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 3",
      "timeframe": "Days 1-90",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    }
  ],
  "quickWins": [
    {
      "action": "<something they can do in under 5 minutes>",
      "why": "<why this matters for LinkedIn growth>",
      "howTo": "<exact step-by-step: go to LinkedIn > ... > change X to Y>"
    }
  ],
  "actionItems": [
    {
      "rank": <1-10>,
      "action": "<short action title>",
      "description": "<what this achieves and why it matters>",
      "steps": [<3-5 exact steps specific enough for a beginner to follow>],
      "impact": "<High|Medium|Low>",
      "effort": "<High|Medium|Low>",
      "category": "<category>",
      "timeline": "<when to do this>"
    }
  ],
  "competitorInsights": [
    {
      "tactic": "<what top LinkedIn creators in this niche do>",
      "description": "<specific example with named creator or company>",
      "howToApply": "<exact steps to replicate this>"
    }
  ],
  "monetisation": {
    "readinessScore": <number 0-100>,
    "currentTier": "<Building|Influencer|Thought Leader|Top Voice>",
    "potentialRevenue": "<estimated monthly revenue range from consulting, speaking, courses>",
    "opportunities": [<3-5 specific revenue streams: LinkedIn Top Voice badge, consulting leads, speaking gigs, newsletter, courses>],
    "requirements": [<what's needed for each opportunity>],
    "nextMilestone": "<the next follower/connection milestone and what it unlocks>"
  }
}

Provide 3-4 content pillars, 5 quick wins, exactly 10 action items, and 3 competitor insights. LinkedIn is a professional network — no hashtag section, no content calendar; focus on thought leadership and connection strategy instead. Every recommendation must be specific to this profile's professional niche. Return ONLY the JSON.`;
}

// ─── Facebook ──────────────────────────────────────────────────────────────────

function buildFacebookPrompt(
  profileData: NormalizedProfile | ManualProfileInput,
  nlpResult?: NlpResult | null,
  trendResult?: TrendResult | null
): string {
  const dataStr = JSON.stringify(profileData, null, 2);
  const nlpSection = buildNlpSection(nlpResult);
  const trendSection = buildTrendSection(trendResult);

  return `You are an expert Facebook page and community growth strategist. Analyze this page and return actionable, specific recommendations. Do NOT give vague advice — every recommendation must include EXACT steps the page owner can do right now.

PAGE DATA:
${dataStr}${nlpSection}${trendSection}

CRITICAL INSTRUCTION: Be extremely specific and actionable. Bad example: "Post more engaging content". Good example: "Post a 'This or That?' poll every Thursday at 7:00 PM in your timezone using two strong contrasting options in your niche (e.g. 'Morning workout OR evening workout?' for a fitness page). Polls consistently get 3-5x more reach than link posts on Facebook because Meta's algorithm prioritises interactive content."

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "profileScore": {
    "overall": <number 0-100>,
    "breakdown": {
      "contentQuality": <number 0-100>,
      "engagement": <number 0-100>,
      "consistency": <number 0-100>,
      "growthPotential": <number 0-100>,
      "brandValue": <number 0-100>
    }
  },
  "engagementStats": {
    "rate": <number as percentage>,
    "avgLikes": <number>,
    "avgComments": <number>,
    "likesToCommentsRatio": <number>,
    "estimatedReach": <number>
  },
  "strengthsWeaknesses": {
    "strengths": [<3-5 specific strings>],
    "weaknesses": [<3-5 specific strings with what to fix>]
  },
  "bioRewrite": "<write the EXACT new page description they should copy-paste, max 255 chars, including niche, key value prop, and a CTA>",
  "contentPillars": [
    {
      "name": "<pillar name>",
      "description": "<brief description>",
      "contentIdeas": [<3 SPECIFIC post ideas with exact captions or hooks they can use>]
    }
  ],
  "communityEngagement": {
    "groupStrategy": "<specific advice on Facebook Groups: whether to create a group, how to link it to the page, what type of group (public/private), and how to use it to drive page growth>",
    "pagePostMix": "<exact recommended post type distribution: percentage breakdown of videos, photos, links, text-only, polls, and Reels for this specific niche>",
    "paidBoostingGuidance": "<specific advice on which posts to boost, what audience to target (demographics, interests, behaviors), and what daily budget delivers best ROI for this niche>"
  },
  "postingStrategy": {
    "currentFrequency": "<estimated current posting frequency>",
    "recommendedFrequency": "<recommended frequency with reasoning for Facebook algorithm>",
    "bestTimes": [{"day": "<day>", "time": "<time in format like 9:00 AM EST>"}],
    "bestFormats": [<recommended content formats: Facebook Reels, Live, native video, carousel, etc.>]
  },
  "hashtags": {
    "niche": [<3 niche-specific hashtags with # — keep minimal on Facebook>],
    "broad": [<3 broad hashtags with #>]
  },
  "roadmap": [
    {
      "phase": "Week 1",
      "timeframe": "Days 1-7",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific daily actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 1",
      "timeframe": "Days 1-30",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    },
    {
      "phase": "Month 3",
      "timeframe": "Days 1-90",
      "goals": [<2-3 measurable goals>],
      "actions": [<5 specific actions>],
      "expectedOutcome": "<specific measurable outcome>"
    }
  ],
  "quickWins": [
    {
      "action": "<something they can do in under 5 minutes>",
      "why": "<why this matters for Facebook page growth>",
      "howTo": "<exact step-by-step: go to Page Settings > ... > change X to Y>"
    }
  ],
  "actionItems": [
    {
      "rank": <1-10>,
      "action": "<short action title>",
      "description": "<what this achieves and why it matters>",
      "steps": [<3-5 exact steps specific enough for a beginner to follow>],
      "impact": "<High|Medium|Low>",
      "effort": "<High|Medium|Low>",
      "category": "<category>",
      "timeline": "<when to do this>"
    }
  ],
  "competitorInsights": [
    {
      "tactic": "<what successful Facebook pages in this niche do>",
      "description": "<specific example of the tactic>",
      "howToApply": "<exact steps to replicate this>"
    }
  ],
  "contentCalendar": [
    {
      "day": "Monday",
      "contentType": "<Reel|Video|Photo|Poll|Text|Live>",
      "topic": "<specific topic>",
      "caption": "<a ready-to-use caption or hook they can copy>",
      "hashtags": "<1-3 relevant hashtags only>"
    }
  ],
  "monetisation": {
    "readinessScore": <number 0-100>,
    "currentTier": "<Small Page|Growing|Monetisation Eligible|Established>",
    "potentialRevenue": "<estimated monthly revenue range>",
    "opportunities": [<3-5 specific revenue streams: Facebook Stars, in-stream ads, fan subscriptions, paid groups, brand partnerships>],
    "requirements": [<what's needed, e.g. 'Reach 10,000 followers and 600,000 minutes viewed for in-stream ad eligibility'>],
    "nextMilestone": "<the next like/follower milestone and what it unlocks>"
  }
}

Provide 3-4 content pillars, 5 quick wins, exactly 10 action items, 3 competitor insights, and a 7-day content calendar. Every recommendation must be specific to this page's niche. Return ONLY the JSON.`;
}

// ─── Phase 4: AI Enhancement Prompt Builders ──────────────────────────────────

export function buildComparePrompt(profiles: NormalizedProfile[], platform: string): string {
  const profilesStr = profiles.map((p) => JSON.stringify(p, null, 2)).join("\n---\n");

  return `You are a social media analyst comparing ${profiles.length} competitor profiles on ${platform}.

PROFILES:
${profilesStr}

Analyze these profiles side-by-side and return ONLY a valid JSON object matching this exact schema:

{
  "platform": "${platform}",
  "analyzedAt": "<ISO timestamp>",
  "profiles": [{ "username": "<string>" }],
  "metricsTable": [
    {
      "metric": "<metric name>",
      "values": [
        { "username": "<string>", "value": "<string or number>", "isLeader": <boolean> }
      ]
    }
  ],
  "narrative": "<3-4 paragraph analysis of key differences and opportunities>",
  "opportunities": ["<specific differentiation opportunity>"]
}

For metricsTable, include these metrics in order: "Followers", "Following", "Posts/Videos", "Engagement Rate", "Verification Status", "Bio Link Present", "Posting Frequency".
Set isLeader: true for the profile leading in that metric (most followers, highest engagement rate, etc.).
For narrative: write 3-4 paragraphs covering content strategy differences, audience engagement patterns, positioning gaps, and growth opportunities.
For opportunities: list 3-5 specific, actionable differentiation opportunities the weakest profile can act on.
Return ONLY valid JSON.`;
}

export function buildCalendarPrompt(profile: NormalizedProfile | ManualProfileInput, platform: string): string {
  const profileStr = JSON.stringify(profile, null, 2);

  return `You are a content strategist creating a 30-day content calendar for @${profile.username} on ${platform}.

PROFILE:
${profileStr}

Create a 30-day content calendar and return ONLY a valid JSON object matching this exact schema:

{
  "platform": "${platform}",
  "username": "${profile.username}",
  "niche": "<inferred niche from profile bio and content>",
  "generatedAt": "<ISO timestamp>",
  "weeks": [
    {
      "weekNumber": 1,
      "monday": {
        "contentIdea": "<specific content idea>",
        "optimalPostingTime": "<e.g. 7:00 PM EST>",
        "contentType": "<reel|story|tweet|video|carousel|post>",
        "captionDraft": "<full caption, 100-150 chars>",
        "hashtags": ["<tag1>", "<tag2>"],
        "mediaSuggestion": "<e.g. vertical video, natural lighting, 15-30s>",
        "engagementPrediction": "<e.g. High — trending format for fitness niche>"
      },
      "tuesday": { ... },
      "wednesday": { ... },
      "thursday": { ... },
      "friday": { ... },
      "saturday": { ... },
      "sunday": { ... }
    }
  ]
}

Requirements:
- Return exactly 4 CalendarWeek objects (weekNumber 1 through 4) covering 28 days
- Each week must have all 7 day keys: monday, tuesday, wednesday, thursday, friday, saturday, sunday
- Each day must have all 7 fields: contentIdea, optimalPostingTime, contentType, captionDraft, hashtags (5-8 tags), mediaSuggestion, engagementPrediction
- Base posting times on the creator's audience timezone inferred from their location or bio. If unknown, default to EST.
- captionDraft must be 100-150 characters, ready to copy-paste
- contentType must be one of: reel, story, tweet, video, carousel, post
- Vary content types across the week for a balanced mix
Return ONLY valid JSON.`;
}

export function buildHashtagPrompt(profile: NormalizedProfile | ManualProfileInput, platform: string): string {
  const profileStr = JSON.stringify(profile, null, 2);

  return `You are a hashtag strategist analyzing the optimal hashtag strategy for @${profile.username} on ${platform}.

PROFILE:
${profileStr}

Analyze this profile and return ONLY a valid JSON object matching this exact schema:

{
  "platform": "${platform}",
  "username": "${profile.username}",
  "niche": "<inferred niche from profile bio and content>",
  "generatedAt": "<ISO timestamp>",
  "categories": [
    {
      "name": "<category name>",
      "tags": ["<#tag1>", "<#tag2>"],
      "estimatedReach": "<e.g. 5K-50K per post>",
      "competitionLevel": "<low|medium|high>",
      "recommendation": "<specific usage advice>"
    }
  ],
  "avoidList": ["<#bannedOrOversaturatedTag>"],
  "weeklyRotationPlan": "<paragraph advice on rotating tags across posts to avoid shadowban>",
  "captionMixFormula": "<e.g. 5 niche + 3 mid-tier + 2 broad per post>"
}

Requirements:
- Return exactly 4 HashtagCategory objects with these names in order:
  1. "Ultra-niche (under 100K posts)"
  2. "Niche (100K-500K posts)"
  3. "Mid-tier (500K-2M posts)"
  4. "Broad (2M+ posts)"
- Each category must have 8-10 tags, estimatedReach, competitionLevel (low/medium/high), and a recommendation
- avoidList: 5-10 oversaturated or banned hashtags to avoid for this specific niche
- weeklyRotationPlan: practical paragraph explaining how to rotate tag sets across posts to maximize reach and avoid shadowban
- captionMixFormula: a clear formula like "5 ultra-niche + 3 mid-tier + 2 broad per post"
- All hashtags must include the # prefix
Return ONLY valid JSON.`;
}
