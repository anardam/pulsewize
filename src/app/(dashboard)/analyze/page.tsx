"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import ManualEntryForm from "@/components/ManualEntryForm";
import ReportDashboard from "@/components/ReportDashboard";
import PlatformGrid from "@/components/PlatformGrid";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import type { AnalysisReport, ManualProfileInput } from "@/lib/types";

type AnalyzeState = "platform" | "input" | "loading" | "manual" | "results" | "error" | "upgrade";

const LAST_PLATFORM_KEY = "sociallens_last_platform";

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter/X",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  facebook: "Facebook",
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

  function handlePlatformSelect(p: string) {
    setPlatform(p);
    localStorage.setItem(LAST_PLATFORM_KEY, p);
    setState("input");
  }

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
        // Non-limit 429 (rate limiting, etc.) — show plain error
        setError(data.error ?? "Too many requests. Please try again later.");
        setState("input");
        return;
      }

      if (!data.success || !data.report) {
        setError(data.error ?? "Something went wrong. Please try again in a moment.");
        setState("error");
        return;
      }

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

  if (state === "loading") {
    return <LoadingScreen />;
  }

  if (state === "platform") {
    return (
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-xl font-semibold text-white">Select a platform</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Choose the platform you want to analyze.
          </p>
          <PlatformGrid
            selectedPlatform={platform}
            onSelect={handlePlatformSelect}
          />
        </div>
      </main>
    );
  }

  if (state === "manual") {
    return (
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <ManualEntryForm
            username={username}
            errorMessage="We couldn't fetch that profile automatically. Enter the details manually to continue."
            onSubmit={handleManualSubmit}
            onBack={handleBack}
          />
        </div>
      </main>
    );
  }

  if (state === "results" && report) {
    return (
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <ReportDashboard
            report={report}
            platform={platform}
            onNewAnalysis={() => {
              setState("platform");
              setReport(null);
            }}
          />
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="text-red-400 text-sm mb-4">
            {error ?? "Unable to fetch profile. Try again later."}
          </p>
          <button
            onClick={handleBack}
            className="py-2 px-4 bg-gray-700 rounded-lg text-white text-sm hover:bg-gray-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (state === "upgrade") {
    return (
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white">Analyze</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ve reached your monthly limit.
            </p>
          </div>
          <UpgradePrompt />
          <button
            onClick={() => { setState("platform"); setError(null); }}
            className="mt-4 text-sm text-muted-foreground hover:text-[#ededed] transition-colors"
          >
            ← Back to platforms
          </button>
        </div>
      </main>
    );
  }

  // input state
  const platformName = PLATFORM_NAMES[platform] ?? platform;
  const inputPlaceholder =
    platform === "linkedin" || platform === "facebook"
      ? "Profile URL or username"
      : `${platformName} username`;

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={() => setState("platform")}
          className="text-sm text-gray-400 hover:text-gray-200 mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-white">
          Analyze a {platformName} profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter a {platformName} username to get AI-powered insights.
        </p>
        <form onSubmit={handleAnalyze} className="mt-6 flex flex-col gap-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder={inputPlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Analyze profile
          </button>
        </form>
      </div>
    </main>
  );
}
