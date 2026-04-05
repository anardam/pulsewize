"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa6";
import type { ChartPoint } from "@/lib/chart-data";
import type { AnalysisReport, ManualProfileInput } from "@/lib/types";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { ConnectedAccountsPanel } from "@/components/home/ConnectedAccountsPanel";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { GrowthChartWrapper } from "@/components/dashboard/GrowthChartWrapper";
import LoadingScreen from "@/components/LoadingScreen";
import ManualEntryForm from "@/components/ManualEntryForm";
import ReportDashboard from "@/components/ReportDashboard";

type AnalyzeState =
  | "input"
  | "loading"
  | "manual"
  | "results"
  | "error"
  | "upgrade";

const LAST_PLATFORM_KEY = "sociallens_last_platform";

interface SavedProfile {
  id: string;
  platform: string;
  username: string;
  display_name: string;
  last_analyzed_at: string;
}

interface ActivityRow {
  id: string;
  platform: string;
  username: string;
  report_type: string;
  analyzed_at: string;
}

interface ProfileSuggestion {
  key: string;
  platform: string;
  username: string;
  displayName: string;
  source: "saved" | "recent";
}

interface Props {
  monthName: string;
  totalReports: number;
  platformCount: number;
  plan: "free" | "pro";
  usageCount: number;
  usageLimitsDisabled?: boolean;
  recentReports: ActivityRow[];
  momentumProfiles?: Array<{
    key: string;
    username: string;
    platform: string;
    points: ChartPoint[];
    analyses: number;
  }>;
  connectedAccounts: Array<{
    id: string;
    platform: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
    connected_at: string;
    last_synced_at: string | null;
  }>;
}

type ConnectedAccount = Props["connectedAccounts"][number];

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: FaInstagram, color: "#E1306C" },
  { id: "youtube", label: "YouTube", icon: FaYoutube, color: "#FF0000" },
  { id: "facebook", label: "Facebook", icon: FaFacebookF, color: "#1877F2" },
];

export function HomeWorkspace({
  monthName,
  totalReports,
  platformCount,
  plan,
  usageCount,
  usageLimitsDisabled = false,
  recentReports,
  momentumProfiles = [],
  connectedAccounts,
}: Props) {
  const [platform, setPlatform] = useState<string>("instagram");
  const [state, setState] = useState<AnalyzeState>("input");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [selectedMomentumKey, setSelectedMomentumKey] = useState<string | null>(
    momentumProfiles[0]?.key ?? null
  );

  useEffect(() => {
    async function loadSavedProfiles() {
      try {
        const res = await fetch("/api/saved-profiles");
        const data = await res.json();
        if (data.success) {
          setSavedProfiles(data.data);
        }
      } catch {
        // Non-fatal.
      }
    }

    loadSavedProfiles();
  }, []);

  useEffect(() => {
    const storedPlatform = window.localStorage.getItem(LAST_PLATFORM_KEY);
    if (storedPlatform) {
      setPlatform(storedPlatform);
    }
  }, []);

  useEffect(() => {
    if (!momentumProfiles.length) {
      setSelectedMomentumKey(null);
      return;
    }

    if (!selectedMomentumKey || !momentumProfiles.some((item) => item.key === selectedMomentumKey)) {
      setSelectedMomentumKey(momentumProfiles[0]?.key ?? null);
    }
  }, [momentumProfiles, selectedMomentumKey]);

  const platformInfo = useMemo(
    () => PLATFORMS.find((item) => item.id === platform) ?? PLATFORMS[0],
    [platform]
  );
  const selectedMomentumProfile = useMemo(
    () =>
      momentumProfiles.find((item) => item.key === selectedMomentumKey) ??
      momentumProfiles[0] ??
      null,
    [momentumProfiles, selectedMomentumKey]
  );
  const profileSuggestions = useMemo(() => {
    const query = username.trim().toLowerCase();
    const suggestions = new Map<string, ProfileSuggestion>();

    for (const profile of savedProfiles) {
      if (profile.platform !== platform) continue;
      const normalizedUsername = profile.username.replace(/^@+/, "");
      const haystack = `${normalizedUsername} ${profile.display_name ?? ""}`.toLowerCase();
      if (query && !haystack.includes(query)) continue;

      suggestions.set(`${profile.platform}:${normalizedUsername}`, {
        key: `${profile.platform}:${normalizedUsername}`,
        platform: profile.platform,
        username: normalizedUsername,
        displayName: profile.display_name || normalizedUsername,
        source: "saved",
      });
    }

    for (const report of recentReports) {
      if (report.platform !== platform) continue;
      const normalizedUsername = report.username.replace(/^@+/, "");
      const haystack = normalizedUsername.toLowerCase();
      if (query && !haystack.includes(query)) continue;

      const key = `${report.platform}:${normalizedUsername}`;
      if (!suggestions.has(key)) {
        suggestions.set(key, {
          key,
          platform: report.platform,
          username: normalizedUsername,
          displayName: normalizedUsername,
          source: "recent",
        });
      }
    }

    return Array.from(suggestions.values()).slice(0, 6);
  }, [platform, recentReports, savedProfiles, username]);

  const isProfileSaved = savedProfiles.some(
    (profile) => profile.platform === platform && profile.username === username.trim()
  );

  const usageLabel = usageLimitsDisabled
    ? "Testing mode - limits disabled"
    : plan === "pro"
      ? "Unlimited analyses"
      : `${usageCount}/3 analyses used`;

  function handlePlatformSelect(nextPlatform: string) {
    setPlatform(nextPlatform);
    localStorage.setItem(LAST_PLATFORM_KEY, nextPlatform);
    setConnectedAccountId(null);
    setIsSuggestionOpen(false);
    setError(null);
  }

  function handleSavedProfileSelect(profile: SavedProfile) {
    setPlatform(profile.platform);
    setUsername(profile.username);
    setIsSuggestionOpen(false);
    setError(null);
    localStorage.setItem(LAST_PLATFORM_KEY, profile.platform);
  }

  function handleSuggestionSelect(suggestion: ProfileSuggestion) {
    setPlatform(suggestion.platform);
    setUsername(suggestion.username);
    setConnectedAccountId(null);
    setIsSuggestionOpen(false);
    setError(null);
    localStorage.setItem(LAST_PLATFORM_KEY, suggestion.platform);
  }

  async function handleSaveProfile() {
    if (!username.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/saved-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username: username.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setSavedProfiles((current) => {
          const filtered = current.filter(
            (profile) =>
              !(profile.platform === platform && profile.username === username.trim())
          );
          return [data.data, ...filtered];
        });
      }
    } catch {
      // Non-fatal.
    } finally {
      setSaving(false);
    }
  }

  async function runAnalysis(options?: {
    username?: string;
    platform?: string;
    connectedAccountId?: string | null;
  }) {
    const nextConnectedAccountId =
      options?.connectedAccountId !== undefined
        ? options.connectedAccountId
        : connectedAccountId;
    const nextPlatform = options?.platform ?? platform;
    const nextUsername =
      options?.username !== undefined ? options.username.trim() : username.trim();

    if (!nextConnectedAccountId && !nextUsername) {
      return;
    }

    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: nextUsername || undefined,
          platform: nextPlatform,
          connectedAccountId: nextConnectedAccountId,
        }),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (response.status === 422 && data.requiresManualEntry) {
        if (platform === "instagram") {
          setState("manual");
        } else {
          setError("Unable to fetch profile. Try again later.");
          setState("error");
        }
        return;
      }

      if (response.status === 429 && data.limitReached) {
        setState("upgrade");
        return;
      }

      if (response.status === 429) {
        setError(data.error ?? "Too many requests. Please try again later.");
        setState("input");
        return;
      }

      if (!data.success || !data.report) {
        setError(
          data.error ?? "Something went wrong. Please try again in a moment."
        );
        setState("error");
        return;
      }

      if (!nextConnectedAccountId && nextUsername) {
        void handleSaveProfile();
      }
      setReport(data.report);
      setState("results");
    } catch {
      setError("Something went wrong on our end. Try refreshing the page.");
      setState("error");
    }
  }

  async function handleAnalyze(event: React.FormEvent) {
    event.preventDefault();
    await runAnalysis();
  }

  async function handleManualSubmit(manualData: ManualProfileInput) {
    setState("loading");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualData }),
      });
      const data = await response.json();

      if (data.success && data.report) {
        setReport(data.report);
        setState("results");
      } else {
        setError(data.error ?? "Analysis failed.");
        setState("error");
      }
    } catch {
      setError("Something went wrong on our end. Try refreshing the page.");
      setState("error");
    }
  }

  function resetWorkspace() {
    setState("input");
    setReport(null);
    setError(null);
    setUsername("");
    setConnectedAccountId(null);
    setIsSuggestionOpen(false);
  }

  async function handleAnalyzeConnected(account: ConnectedAccount) {
    setPlatform(account.platform);
    localStorage.setItem(LAST_PLATFORM_KEY, account.platform);
    setConnectedAccountId(account.id);
    setUsername("");
    setError(null);
    await runAnalysis({
      platform: account.platform,
      connectedAccountId: account.id,
      username: "",
    });
  }

  if (state === "loading") {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-10">
      <ConnectedAccountsPanel
        accounts={connectedAccounts}
        onAnalyzeConnected={handleAnalyzeConnected}
      />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400/80">
              {monthName}
            </p>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#f5efe7] sm:text-5xl">
                Read the room, then decide your next move.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#a59e97]">
                Search a profile, revisit saved handles, and turn the latest read
                into a sharper content plan without bouncing between screens.
              </p>
            </div>
          </div>

          <div
            id="studio"
            className="rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(225,70,124,0.14),transparent_34%),linear-gradient(180deg,rgba(20,20,20,0.98),rgba(14,14,14,0.98))] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.35)] sm:p-7"
          >
            {state === "manual" ? (
              <ManualEntryForm
                username={username}
                errorMessage="We couldn't fetch that profile automatically. Enter the details manually to continue."
                onSubmit={handleManualSubmit}
                onBack={() => setState("input")}
              />
            ) : state === "upgrade" ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/80">
                    Monthly limit reached
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f5efe7]">
                    Keep the flow going
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#a59e97]">
                    You&apos;ve hit the free limit for this month. Upgrade when
                    you want unlimited reads and deeper analysis runs.
                  </p>
                </div>
                <UpgradePrompt />
                <button
                  onClick={resetWorkspace}
                  className="inline-flex items-center gap-2 text-sm text-[#a59e97] transition-colors hover:text-[#f5efe7]"
                >
                  <RotateCcw size={14} />
                  Back to the workspace
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((item) => {
                    const isActive = item.id === platform;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handlePlatformSelect(item.id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                          isActive
                            ? "border-white/[0.14] bg-white/[0.08] text-[#f5efe7]"
                            : "border-white/[0.06] bg-white/[0.02] text-[#a59e97] hover:border-white/[0.12] hover:text-[#f5efe7]"
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${item.color}18` }}
                        >
                          <Icon size={12} style={{ color: item.color }} />
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleAnalyze} className="space-y-4">
                  <div className="rounded-[24px] border border-white/[0.08] bg-black/20 p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8f877f]">
                          {connectedAccountId ? "Owned account read" : "Public profile read"}
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f5efe7]">
                          {connectedAccountId
                            ? "Analyze your connected channel"
                            : `${platformInfo.label} profile analysis`}
                        </h2>
                      </div>
                      <p className="text-sm text-[#8f877f]">{usageLabel}</p>
                    </div>

                    {connectedAccountId ? (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="flex-1 rounded-2xl border border-white/[0.1] bg-[#151515] px-4 py-4 text-sm text-[#a59e97]">
                          We&apos;ll use the latest synced data from your connected account.
                        </div>
                        <button
                          type="button"
                          onClick={() => setConnectedAccountId(null)}
                          className="rounded-2xl border border-white/[0.08] px-5 py-4 text-sm text-[#f5efe7] hover:bg-white/[0.04]"
                        >
                          Use public profile instead
                        </button>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f5efe7] px-5 py-4 text-sm font-semibold text-[#111111] transition-transform hover:-translate-y-0.5"
                        >
                          <Sparkles size={15} />
                          Run analysis
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder={
                              platform === "facebook"
                                ? "Paste a profile URL or username"
                                : `Enter a ${platformInfo.label} username`
                            }
                            value={username}
                            onChange={(event) => {
                              setUsername(event.target.value);
                              setIsSuggestionOpen(true);
                            }}
                            onFocus={() => setIsSuggestionOpen(true)}
                            onBlur={() => {
                              window.setTimeout(() => setIsSuggestionOpen(false), 120);
                            }}
                            required
                            className="w-full rounded-2xl border border-white/[0.1] bg-[#151515] px-4 py-4 pr-12 text-sm text-[#f5efe7] placeholder:text-[#6f6963] focus:border-rose-500/40 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                          />
                          {isSuggestionOpen && profileSuggestions.length > 0 && (
                            <div className="absolute inset-x-0 top-[calc(100%+0.6rem)] z-20 overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#111111] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                              {profileSuggestions.map((suggestion) => {
                                const suggestionPlatform =
                                  PLATFORMS.find((entry) => entry.id === suggestion.platform) ??
                                  PLATFORMS[0];
                                const Icon = suggestionPlatform.icon;

                                return (
                                  <button
                                    key={suggestion.key}
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      handleSuggestionSelect(suggestion);
                                    }}
                                    className="flex w-full items-center gap-3 border-t border-white/[0.04] px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-white/[0.03]"
                                  >
                                    <span
                                      className="flex h-9 w-9 items-center justify-center rounded-2xl"
                                      style={{ backgroundColor: `${suggestionPlatform.color}14` }}
                                    >
                                      <Icon size={14} style={{ color: suggestionPlatform.color }} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium text-[#f5efe7]">
                                        {suggestion.displayName}
                                      </span>
                                      <span className="block truncate text-xs text-[#8f877f]">
                                        @{suggestion.username}
                                      </span>
                                    </span>
                                    <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#8f877f]">
                                      {suggestion.source}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {username.trim() && (
                            <button
                              type="button"
                              onClick={handleSaveProfile}
                              disabled={saving || isProfileSaved}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8f877f] transition-colors hover:text-rose-300 disabled:opacity-50"
                              title={isProfileSaved ? "Profile saved" : "Save profile"}
                            >
                              {isProfileSaved ? (
                                <BookmarkCheck size={18} className="text-rose-300" />
                              ) : (
                                <Bookmark size={18} />
                              )}
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f5efe7] px-5 py-4 text-sm font-semibold text-[#111111] transition-transform hover:-translate-y-0.5"
                        >
                          <Sparkles size={15} />
                          Run analysis
                        </button>
                      </div>
                    )}
                  </div>

                  {error && state === "error" && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </motion.div>
                  )}
                </form>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {savedProfiles.slice(0, 6).map((profile) => {
                    const item =
                      PLATFORMS.find((entry) => entry.id === profile.platform) ?? PLATFORMS[0];
                    const Icon = item.icon;

                    return (
                      <button
                        key={profile.id}
                        onClick={() => handleSavedProfileSelect(profile)}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                      >
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: `${item.color}14` }}
                        >
                          <Icon size={16} style={{ color: item.color }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[#f5efe7]">
                            {profile.display_name || profile.username}
                          </span>
                          <span className="block truncate text-xs text-[#8f877f]">
                            @{profile.username}
                          </span>
                        </span>
                        <ArrowRight size={14} className="text-[#6f6963]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/[0.08] bg-[#131313] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8f877f]">
              Current footing
            </p>
            <div className="mt-5 grid gap-5">
              <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div>
                  <p className="text-sm text-[#8f877f]">Plan</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-[#f5efe7]">
                    {plan === "pro" ? "Pro" : "Free"}
                  </p>
                </div>
                  <p className="max-w-[10rem] text-right text-sm leading-6 text-[#a59e97]">
                  {usageLimitsDisabled
                    ? "Testing mode is active, so monthly analysis limits are currently turned off."
                    : plan === "pro"
                      ? "Unlimited reads across all active platforms."
                      : "Three analyses per month before upgrade prompts appear."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MetricBlock label="Reports saved" value={totalReports.toString()} />
                <MetricBlock label="Platforms used" value={platformCount.toString()} />
                <MetricBlock
                  label="Used this month"
                  value={
                    usageLimitsDisabled
                      ? "Off"
                      : plan === "pro"
                        ? usageCount.toString()
                        : `${usageCount}/3`
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-[#131313] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8f877f]">
              Why this works better
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#a59e97]">
              <li>One surface for searching, saving, revisiting, and reading profiles.</li>
              <li>Reports and settings stay available, but no longer crowd the main flow.</li>
              <li>The interface is organized around decisions and signals, not dashboard chrome.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/80">
                Recent signal
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f5efe7]">
                What you looked at lately
              </h2>
            </div>
          </div>
          <ActivityFeed reports={recentReports} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/80">
              Momentum
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f5efe7]">
              {selectedMomentumProfile
                ? `How @${selectedMomentumProfile.username.replace(/^@+/, "")} is shifting`
                : "Growth appears once a handle repeats"}
            </h2>
          </div>

          {selectedMomentumProfile ? (
            <div className="space-y-4">
              {momentumProfiles.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {momentumProfiles.map((profile) => {
                    const item =
                      PLATFORMS.find((entry) => entry.id === profile.platform) ?? PLATFORMS[0];
                    const Icon = item.icon;
                    const isActive = profile.key === selectedMomentumProfile.key;

                    return (
                      <button
                        key={profile.key}
                        type="button"
                        onClick={() => setSelectedMomentumKey(profile.key)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all ${
                          isActive
                            ? "border-white/[0.14] bg-white/[0.08] text-[#f5efe7]"
                            : "border-white/[0.06] bg-white/[0.02] text-[#a59e97] hover:border-white/[0.12] hover:text-[#f5efe7]"
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${item.color}18` }}
                        >
                          <Icon size={12} style={{ color: item.color }} />
                        </span>
                        <span>@{profile.username.replace(/^@+/, "")}</span>
                        <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#8f877f]">
                          {profile.analyses} reads
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <GrowthChartWrapper
                data={selectedMomentumProfile.points}
                username={selectedMomentumProfile.username}
              />
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-[#131313]/60 p-10 text-center text-sm leading-6 text-[#8f877f]">
              Run the same profile more than once and we&apos;ll start showing the
              movement here.
            </div>
          )}
        </div>
      </section>

      {state === "results" && report && (
        <section className="space-y-5">
          <div className="divider-rose" />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/80">
              Latest reading
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f5efe7]">
              Strategy and recommendations for @{report.username.replace(/^@+/, "")}
            </h2>
          </div>
          <ReportDashboard
            report={report}
            platform={platform}
            onNewAnalysis={resetWorkspace}
          />
        </section>
      )}
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#726b65]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#f5efe7]">
        {value}
      </p>
    </div>
  );
}
