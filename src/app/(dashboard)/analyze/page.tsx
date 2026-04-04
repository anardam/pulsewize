"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  FaInstagram,
  FaYoutube,
  FaXTwitter,
  FaTiktok,
  FaLinkedinIn,
  FaFacebookF,
} from "react-icons/fa6";
import LoadingScreen from "@/components/LoadingScreen";
import ManualEntryForm from "@/components/ManualEntryForm";
import ReportDashboard from "@/components/ReportDashboard";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import type { AnalysisReport, ManualProfileInput } from "@/lib/types";

type AnalyzeState =
  | "platform"
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

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: FaInstagram, color: "#E1306C" },
  { id: "youtube", label: "YouTube", icon: FaYoutube, color: "#FF0000" },
  { id: "twitter", label: "Twitter/X", icon: FaXTwitter, color: "#1DA1F2" },
  { id: "tiktok", label: "TikTok", icon: FaTiktok, color: "#00f2ea" },
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedinIn, color: "#0A66C2" },
  { id: "facebook", label: "Facebook", icon: FaFacebookF, color: "#1877F2" },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export default function AnalyzePage() {
  const router = useRouter();

  const [platform, setPlatform] = useState<string>(() => {
    if (typeof window === "undefined") return "instagram";
    return localStorage.getItem(LAST_PLATFORM_KEY) ?? "instagram";
  });

  const [state, setState] = useState<AnalyzeState>("platform");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [saving, setSaving] = useState(false);

  // Load saved profiles
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/saved-profiles");
        const data = await res.json();
        if (data.success) setSavedProfiles(data.data);
      } catch {
        // non-fatal
      }
    }
    load();
  }, []);

  function handlePlatformSelect(p: string) {
    setPlatform(p);
    localStorage.setItem(LAST_PLATFORM_KEY, p);
    setState("input");
  }

  function handleSavedProfileSelect(profile: SavedProfile) {
    setPlatform(profile.platform);
    setUsername(profile.username);
    localStorage.setItem(LAST_PLATFORM_KEY, profile.platform);
    setState("input");
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
        setSavedProfiles((prev) => {
          const filtered = prev.filter(
            (p) => !(p.platform === platform && p.username === username.trim())
          );
          return [data.data, ...filtered];
        });
      }
    } catch {
      // non-fatal
    }
    setSaving(false);
  }

  const isProfileSaved = savedProfiles.some(
    (p) => p.platform === platform && p.username === username.trim()
  );

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), platform }),
      });

      if (response.status === 401) {
        router.push("/login");
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

      // Auto-save profile on successful analysis
      handleSaveProfile();

      setReport(data.report);
      setState("results");
    } catch {
      setError("Something went wrong on our end. Try refreshing the page.");
      setState("error");
    }
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

  function handleBack() {
    setState("input");
    setError(null);
  }

  if (state === "loading") return <LoadingScreen />;

  if (state === "manual") {
    return (
      <div>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <ManualEntryForm
            username={username}
            errorMessage="We couldn't fetch that profile automatically. Enter the details manually to continue."
            onSubmit={handleManualSubmit}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  if (state === "results" && report) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ReportDashboard
          report={report}
          platform={platform}
          onNewAnalysis={() => {
            setState("platform");
            setReport(null);
            setUsername("");
          }}
        />
      </motion.div>
    );
  }

  if (state === "upgrade") {
    return (
      <motion.div {...fadeUp}>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-xl font-bold mb-2">Monthly limit reached</h1>
          <p className="text-sm text-[#8a8580] mb-8">
            Upgrade to Pro for unlimited analyses and multi-agent AI reports.
          </p>
          <UpgradePrompt />
          <button
            onClick={() => {
              setState("platform");
              setError(null);
            }}
            className="mt-6 text-sm text-[#8a8580] hover:text-[#e8e4df] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Back to platforms
          </button>
        </div>
      </motion.div>
    );
  }

  if (state === "error") {
    return (
      <motion.div {...fadeUp}>
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 mb-4">
            <RotateCcw size={20} className="text-red-400" />
          </div>
          <p className="text-[#e8e4df] text-sm mb-6">
            {error ?? "Unable to fetch profile. Try again later."}
          </p>
          <button
            onClick={handleBack}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-[#e8e4df] border border-white/[0.06] transition-all duration-200"
          >
            Try again
          </button>
        </div>
      </motion.div>
    );
  }

  // Platform selection state
  if (state === "platform") {
    const savedForPlatforms = savedProfiles.reduce(
      (acc, p) => {
        if (!acc[p.platform]) acc[p.platform] = [];
        acc[p.platform].push(p);
        return acc;
      },
      {} as Record<string, SavedProfile[]>
    );

    return (
      <div>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <motion.div {...fadeUp}>
            <h1 className="text-2xl font-bold tracking-tight">Analyze</h1>
            <p className="text-sm text-[#8a8580] mt-1.5">
              Choose a platform or select a saved profile to analyze.
            </p>
          </motion.div>

          {/* Saved Profiles */}
          {savedProfiles.length > 0 && (
            <motion.div
              className="mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#8a8580] mb-3 flex items-center gap-2">
                <BookmarkCheck size={13} />
                Saved profiles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {savedProfiles.slice(0, 6).map((profile, i) => {
                  const platformInfo = PLATFORMS.find(
                    (p) => p.id === profile.platform
                  );
                  const Icon = platformInfo?.icon ?? Instagram;
                  return (
                    <motion.button
                      key={profile.id}
                      onClick={() => handleSavedProfileSelect(profile)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141414] border border-white/[0.06] hover:border-rose-500/20 hover:bg-[#1a1a1a] transition-all duration-200 text-left group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                    >
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${platformInfo?.color}15`,
                        }}
                      >
                        <Icon
                          size={15}
                          style={{ color: platformInfo?.color }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#e8e4df] truncate">
                          {profile.display_name || profile.username}
                        </p>
                        <p className="text-[11px] text-[#8a8580]">
                          {platformInfo?.label}
                        </p>
                      </div>
                      <Sparkles
                        size={13}
                        className="ml-auto text-[#8a8580] opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Platform Grid */}
          <motion.div className="mt-10" variants={stagger} initial="initial" animate="animate">
            <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#8a8580] mb-3">
              New analysis
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {PLATFORMS.map((p) => {
                const count = savedForPlatforms[p.id]?.length ?? 0;
                return (
                  <motion.button
                    key={p.id}
                    onClick={() => handlePlatformSelect(p.id)}
                    className="flex flex-col items-center gap-3 px-4 py-5 rounded-xl bg-[#141414] border border-white/[0.06] hover:border-rose-500/20 hover:bg-[#1a1a1a] transition-all duration-200 group"
                    variants={fadeUp}
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${p.color}12` }}
                    >
                      <p.icon size={20} style={{ color: p.color }} />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-medium text-[#e8e4df]">
                        {p.label}
                      </p>
                      {count > 0 && (
                        <p className="text-[10px] text-[#8a8580] mt-0.5">
                          {count} saved
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Input state
  const platformInfo = PLATFORMS.find((p) => p.id === platform);
  const Icon = platformInfo?.icon ?? Instagram;
  const inputPlaceholder =
    platform === "linkedin" || platform === "facebook"
      ? "Profile URL or username"
      : `${platformInfo?.label} username`;

  return (
    <AnimatePresence mode="wait">
      <motion.div key="input" {...fadeUp}>
        <div className="max-w-lg mx-auto px-6 py-12">
          {/* Back button */}
          <button
            onClick={() => setState("platform")}
            className="text-sm text-[#8a8580] hover:text-[#e8e4df] mb-8 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            All platforms
          </button>

          {/* Platform header */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${platformInfo?.color}15` }}
            >
              <Icon size={22} style={{ color: platformInfo?.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {platformInfo?.label} analysis
              </h1>
              <p className="text-sm text-[#8a8580]">
                Enter a profile to get AI-powered insights
              </p>
            </div>
          </div>

          {/* Input form */}
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5550]"
              />
              <input
                type="text"
                placeholder={inputPlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-white/[0.1] bg-[#141414] text-sm text-[#e8e4df] placeholder:text-[#5a5550] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/30 transition-all duration-200"
              />
              {username.trim() && (
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving || isProfileSaved}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8580] hover:text-rose-400 transition-colors disabled:opacity-50"
                  title={isProfileSaved ? "Profile saved" : "Save profile"}
                >
                  {isProfileSaved ? (
                    <BookmarkCheck size={16} className="text-rose-400" />
                  ) : (
                    <Bookmark size={16} />
                  )}
                </button>
              )}
            </div>

            {error && (
              <motion.div
                className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-xl hover:shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              <Sparkles size={15} />
              Analyze profile
            </button>
          </form>

          {/* Saved profiles for this platform */}
          {savedProfiles.filter((p) => p.platform === platform).length > 0 && (
            <motion.div
              className="mt-8 pt-6 border-t border-white/[0.06]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#8a8580] mb-3">
                Saved {platformInfo?.label} profiles
              </h3>
              <div className="space-y-1.5">
                {savedProfiles
                  .filter((p) => p.platform === platform)
                  .map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setUsername(profile.username);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
                    >
                      <span className="text-sm text-[#e8e4df]">
                        {profile.username}
                      </span>
                      <span className="text-[11px] text-[#5a5550] ml-auto">
                        {new Date(profile.last_analyzed_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
