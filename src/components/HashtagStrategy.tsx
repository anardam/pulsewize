"use client";

import { useState } from "react";
import type { AnalysisReport, HashtagStrategyReport, HashtagCategory } from "@/lib/types";

interface Props {
  platform: string;
  username: string;
  report: AnalysisReport;
}

type State = "idle" | "loading" | "result";

function competitionColor(level: HashtagCategory["competitionLevel"]) {
  if (level === "low") return "bg-green-500/20 text-green-300 border-green-500/30";
  if (level === "medium") return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  return "bg-red-500/20 text-red-300 border-red-500/30";
}

function competitionLabel(level: HashtagCategory["competitionLevel"]) {
  if (level === "low") return "Low Competition";
  if (level === "medium") return "Medium Competition";
  return "High Competition";
}

export default function HashtagStrategy({ platform, username, report }: Props) {
  const [state, setState] = useState<State>("idle");
  const [strategy, setStrategy] = useState<HashtagStrategyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  async function handleGenerate() {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username, analysisReport: report }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.strategy) {
        setError(data.error ?? "Failed to generate hashtag strategy. Please try again.");
        setState("idle");
        return;
      }

      setStrategy(data.strategy);
      setState("result");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("idle");
    }
  }

  function handleCopyTag(tag: string) {
    const withHash = tag.startsWith("#") ? tag : `#${tag}`;
    navigator.clipboard.writeText(withHash);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-gray-400">Generating hashtag strategy...</p>
      </div>
    );
  }

  if (state === "result" && strategy) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold gradient-text">Hashtag Strategy</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              @{strategy.username} &middot; {strategy.niche} &middot;{" "}
              {new Date(strategy.generatedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => { setState("idle"); setStrategy(null); }}
            className="text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
          >
            Regenerate
          </button>
        </div>

        {/* Caption Mix Formula */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-1.5">
            Caption Mix Formula
          </p>
          <p className="text-white font-semibold text-sm">{strategy.captionMixFormula}</p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {strategy.categories.map((category, i) => (
            <div
              key={i}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 card-glow space-y-3"
            >
              {/* Category header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{category.name}</h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${competitionColor(category.competitionLevel)}`}
                >
                  {competitionLabel(category.competitionLevel)}
                </span>
              </div>

              {/* Reach + Recommendation */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-purple-400">~{category.estimatedReach}</span>
                <span>&middot;</span>
                <span>{category.recommendation}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {category.tags.map((tag, j) => (
                  <button
                    key={j}
                    onClick={() => handleCopyTag(tag)}
                    className={`px-2 py-0.5 text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full transition-colors ${
                      copiedTag === tag ? "bg-purple-500/30 text-purple-200" : "hover:bg-purple-500/20"
                    }`}
                    title="Click to copy"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                    {copiedTag === tag && <span className="ml-1 text-[9px]">Copied</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Avoid List */}
        {strategy.avoidList.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 card-glow">
            <h3 className="text-sm font-semibold text-red-400 mb-3">Avoid These (Oversaturated)</h3>
            <div className="flex flex-wrap gap-1.5">
              {strategy.avoidList.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Rotation Plan */}
        {strategy.weeklyRotationPlan && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 card-glow">
            <h3 className="text-sm font-semibold gradient-text mb-2">Weekly Rotation Plan</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{strategy.weeklyRotationPlan}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold gradient-text">Hashtag Strategy</h2>
        <p className="text-sm text-gray-400 mt-1">
          Get AI-powered hashtag recommendations optimized for @{username}&apos;s niche and platform.
        </p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 sm:p-8 card-glow flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Get Hashtag Strategy</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            Categorized tags with estimated reach, competition levels, and a caption mix formula.
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleGenerate}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Get Hashtag Strategy
        </button>
      </div>
    </div>
  );
}
