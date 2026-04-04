export interface InstagramProfile {
  platform: "instagram";
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  profilePicUrl: string;
  externalUrl?: string;
  recentPosts?: RecentPost[];
}

export interface RecentPost {
  likes: number;
  comments: number;
  caption?: string;
  timestamp?: string;
  isVideo: boolean;
}

export interface ManualProfileInput {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  externalUrl?: string;
  avgLikesPerPost?: number;
  avgCommentsPerPost?: number;
  contentNiche?: string;
}

export interface ProfileScore {
  overall: number;
  breakdown: {
    contentQuality: number;
    engagement: number;
    consistency: number;
    growthPotential: number;
    brandValue: number;
  };
}

export interface EngagementStats {
  rate: number;
  avgLikes: number;
  avgComments: number;
  likesToCommentsRatio: number;
  estimatedReach: number;
}

export interface StrengthWeakness {
  strengths: string[];
  weaknesses: string[];
}

export interface ContentPillar {
  name: string;
  description: string;
  contentIdeas: string[];
}

export interface PostingStrategy {
  currentFrequency: string;
  recommendedFrequency: string;
  bestTimes: { day: string; time: string }[];
  bestFormats: string[];
}

export interface HashtagGroup {
  niche: string[];
  midTier: string[];
  broad: string[];
}

export interface RoadmapPhase {
  phase: string;
  timeframe: string;
  goals: string[];
  actions: string[];
  expectedOutcome: string;
}

export interface ActionItem {
  rank: number;
  action: string;
  description: string;
  steps: string[];
  impact: "High" | "Medium" | "Low";
  effort: "High" | "Medium" | "Low";
  category: string;
  timeline: string;
}

export interface QuickWin {
  action: string;
  why: string;
  howTo: string;
}

export interface CompetitorInsight {
  tactic: string;
  description: string;
  howToApply: string;
}

export interface ContentCalendarDay {
  day: string;
  contentType: string;
  topic: string;
  caption: string;
  hashtags: string;
}

export interface MonetisationAssessment {
  readinessScore: number;
  currentTier: string;
  potentialRevenue: string;
  opportunities: string[];
  requirements: string[];
  nextMilestone: string;
}

export interface NlpData {
  themes: string[];
  keywords: string[];
  sentimentScore: number;
  sentimentLabel: string;
}

export interface TrendData {
  keyword: string;
  direction: "rising" | "stable" | "declining";
  timelineData?: { date: string; value: number }[];
}

export interface MultiAgentMetadata {
  providers: string[];
  providerCount: number;
  successCount: number;
  synthesized: boolean;
}

export interface AnalysisReport {
  profileScore: ProfileScore;
  engagementStats: EngagementStats;
  strengthsWeaknesses: StrengthWeakness;
  bioRewrite: string;
  contentPillars: ContentPillar[];
  postingStrategy: PostingStrategy;
  hashtags: HashtagGroup;
  roadmap: RoadmapPhase[];
  actionItems: ActionItem[];
  quickWins: QuickWin[];
  competitorInsights: CompetitorInsight[];
  contentCalendar: ContentCalendarDay[];
  monetisation: MonetisationAssessment;
  analyzedAt: string;
  username: string;
  nlp?: NlpData;
  trend?: TrendData;
  multiAgentMeta?: MultiAgentMetadata;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  cliInstalled: boolean;
  cliAuthenticated: boolean;
  isVercel?: boolean;
  hasServerApiKey?: boolean;
  message: string;
}

export interface AnalysisResponse {
  success: boolean;
  report?: AnalysisReport;
  error?: string;
  requiresManualEntry?: boolean;
}

// ─── Phase 4: AI Enhancement Types ────────────────────────────────────────────

export interface CalendarEntry {
  contentIdea: string;
  optimalPostingTime: string;      // e.g. "7:00 PM EST"
  contentType: "reel" | "story" | "tweet" | "video" | "carousel" | "post";
  captionDraft: string;
  hashtags: string[];              // 5-10 tags
  mediaSuggestion: string;         // e.g. "vertical video, natural lighting, 15-30s"
  engagementPrediction: string;    // e.g. "High — trending format for fitness niche"
}

export interface CalendarWeek {
  weekNumber: number;              // 1-4 or 1-5
  monday: CalendarEntry;
  tuesday: CalendarEntry;
  wednesday: CalendarEntry;
  thursday: CalendarEntry;
  friday: CalendarEntry;
  saturday: CalendarEntry;
  sunday: CalendarEntry;
}

export interface ContentCalendarReport {
  platform: string;
  username: string;
  niche: string;
  generatedAt: string;
  weeks: CalendarWeek[];           // 4-5 weeks = 28-35 days
}

export interface CompetitorMetricRow {
  metric: string;                  // "Followers", "Engagement Rate", etc.
  values: { username: string; value: string | number; isLeader: boolean }[];
}

export interface CompetitorComparisonReport {
  platform: string;
  analyzedAt: string;
  profiles: { username: string }[];
  metricsTable: CompetitorMetricRow[];
  narrative: string;               // AI narrative paragraph(s)
  opportunities: string[];         // Top 3-5 differentiation opportunities
}

export interface HashtagCategory {
  name: string;                    // e.g. "Ultra-niche (under 100K posts)"
  tags: string[];
  estimatedReach: string;          // e.g. "5K-50K per post"
  competitionLevel: "low" | "medium" | "high";
  recommendation: string;          // e.g. "Use 5-8 of these per post"
}

export interface HashtagStrategyReport {
  platform: string;
  username: string;
  niche: string;
  generatedAt: string;
  categories: HashtagCategory[];   // ultra-niche / niche / mid-tier / broad
  avoidList: string[];             // oversaturated tags to avoid
  weeklyRotationPlan: string;      // text advice on rotating tags
  captionMixFormula: string;       // e.g. "5 niche + 3 mid-tier + 2 broad per post"
}

// MultiAgentMetadata defined above (line 142)
