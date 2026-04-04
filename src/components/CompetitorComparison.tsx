"use client";

import { useState, useEffect } from "react";
import type { AnalysisReport, CompetitorComparisonReport } from "@/lib/types";

interface Props {
  platform: string;
  currentUsername: string;
  currentReport: AnalysisReport;
}

type State = "input" | "loading" | "result";
type Mode = "handles" | "saved";

interface SavedReport {
  id: string;
  platform: string;
  username: string;
  analyzed_at: string;
}

export default function CompetitorComparison({ platform, currentUsername, currentReport }: Props) {
  const [state, setState] = useState<State>("input");
  const [mode, setMode] = useState<Mode>("handles");
  const [usernames, setUsernames] = useState<string>("");
  const [report, setReport] = useState<CompetitorComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Saved reports state
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);

  useEffect(() => {
    if (mode !== "saved") return;
    if (savedReports.length > 0) return;

    setSavedLoading(true);
    setSavedError(null);

    fetch("/api/reports?report_type=analysis&page=1")
      .then((res) => res.json() as Promise<{ success: boolean; data?: SavedReport[]; error?: string }>)
      .then((data) => {
        if (!data.success) {
          setSavedError(data.error ?? "Failed to load saved reports");
          return;
        }
        // Deduplicate by username (keep latest per username, excluding current user)
        const seen = new Set<string>();
        const deduped: SavedReport[] = [];
        for (const r of data.data ?? []) {
          if (r.username === currentUsername) continue;
          if (!seen.has(r.username)) {
            seen.add(r.username);
            deduped.push(r);
          }
        }
        setSavedReports(deduped);
      })
      .catch(() => setSavedError("Failed to load saved reports"))
      .finally(() => setSavedLoading(false));
  }, [mode, savedReports.length, currentUsername]);

  function handleSavedToggle(username: string) {
    setSelectedUsernames((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : prev.length < 2
        ? [...prev, username]
        : prev
    );
  }

  function handleUseSavedReports() {
    if (selectedUsernames.length === 0) {
      setError("Select at least 1 saved report to compare");
      return;
    }
    // Pre-fill handles and switch to handles mode
    setUsernames(selectedUsernames.join(", "));
    setMode("handles");
    setError(null);
  }

  async function handleCompare() {
    const extraHandles = usernames
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    if (extraHandles.length === 0) {
      setError("Please enter at least 1 competitor handle.");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          usernames: [currentUsername, ...extraHandles],
          currentReport,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.report) {
        setError(data.error ?? "Comparison failed. Please try again.");
        setState("input");
        return;
      }

      setReport(data.report);
      setState("result");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("input");
    }
  }

  function handleReset() {
    setState("input");
    setReport(null);
    setError(null);
    setUsernames("");
    setSelectedUsernames([]);
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-gray-400">Analyzing competitors...</p>
      </div>
    );
  }

  if (state === "result" && report) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold gradient-text">Competitor Comparison</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {report.platform} &middot; {new Date(report.analyzedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-700 px-3 py-1.5 rounded-lg"
          >
            Compare Again
          </button>
        </div>

        {/* Metrics Table */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-x-auto card-glow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium w-32">Metric</th>
                {report.profiles.map((profile) => (
                  <th
                    key={profile.username}
                    className="text-center px-4 py-3 text-gray-300 font-semibold"
                  >
                    @{profile.username}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.metricsTable.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-400 text-xs font-medium">{row.metric}</td>
                  {row.values.map((cell) => (
                    <td
                      key={cell.username}
                      className={`px-4 py-3 text-center ${
                        cell.isLeader
                          ? "bg-purple-500/20 text-purple-300 font-semibold"
                          : "text-gray-300"
                      }`}
                    >
                      {cell.isLeader && (
                        <span className="mr-1 text-purple-400 text-xs">*</span>
                      )}
                      {cell.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Narrative */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 sm:p-6 card-glow">
          <h3 className="text-base sm:text-lg font-semibold mb-3 gradient-text">Analysis</h3>
          {report.narrative.split("\n").filter(Boolean).map((paragraph, i) => (
            <p key={i} className="text-gray-300 leading-relaxed mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Opportunities */}
        {report.opportunities.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 sm:p-6 card-glow">
            <h3 className="text-base sm:text-lg font-semibold mb-3 gradient-text">
              Differentiation Opportunities
            </h3>
            <ul className="space-y-2">
              {report.opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0 font-bold">+</span>
                  <span className="text-gray-300 text-sm">{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold gradient-text">Compare Competitors</h2>
        <p className="text-sm text-gray-400 mt-1">
          Enter 1-2 competitor handles to get a side-by-side analysis against @{currentUsername}.
        </p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 sm:p-6 card-glow space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              mode === "handles"
                ? "bg-violet-600 text-white"
                : "bg-[#111118] border border-white/[0.08] text-muted-foreground"
            }`}
            onClick={() => { setMode("handles"); setError(null); }}
          >
            Enter handles
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              mode === "saved"
                ? "bg-violet-600 text-white"
                : "bg-[#111118] border border-white/[0.08] text-muted-foreground"
            }`}
            onClick={() => { setMode("saved"); setError(null); }}
          >
            From saved reports
          </button>
        </div>

        {mode === "handles" && (
          <>
            {/* Current profile pre-filled */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Your profile (current)</label>
              <div className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 text-sm">
                @{currentUsername}
              </div>
            </div>

            {/* Competitor handles */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Competitor handles (comma-separated, 1-2 handles)
              </label>
              <textarea
                value={usernames}
                onChange={(e) => setUsernames(e.target.value)}
                placeholder="competitor1, competitor2"
                rows={2}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              onClick={handleCompare}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Compare
            </button>
          </>
        )}

        {mode === "saved" && (
          <>
            <p className="text-xs text-gray-400">
              Select up to 2 previously analyzed profiles to compare against @{currentUsername}.
            </p>

            {savedLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                Loading saved reports...
              </div>
            )}

            {savedError && <p className="text-red-400 text-xs">{savedError}</p>}

            {!savedLoading && !savedError && savedReports.length === 0 && (
              <p className="text-sm text-gray-500">
                No saved reports found. Analyze some profiles first.
              </p>
            )}

            {!savedLoading && savedReports.length > 0 && (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {savedReports.map((r) => {
                  const isSelected = selectedUsernames.includes(r.username);
                  const isDisabled = !isSelected && selectedUsernames.length >= 2;
                  return (
                    <li key={r.id}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-violet-500/50 bg-violet-500/10"
                            : isDisabled
                            ? "border-gray-700/50 bg-gray-800/30 opacity-50 cursor-not-allowed"
                            : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => handleSavedToggle(r.username)}
                          className="accent-violet-500"
                        />
                        <span className="text-sm text-gray-300">@{r.username}</span>
                        <span className="text-xs text-gray-500 ml-auto">{r.platform}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="button"
              onClick={handleUseSavedReports}
              disabled={selectedUsernames.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Compare selected ({selectedUsernames.length})
            </button>
          </>
        )}
      </div>
    </div>
  );
}
