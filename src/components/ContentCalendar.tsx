"use client";

import { useState } from "react";
import type { AnalysisReport, ContentCalendarReport, CalendarEntry, CalendarWeek } from "@/lib/types";

interface Props {
  platform: string;
  username: string;
  report: AnalysisReport;
}

type State = "idle" | "loading" | "result";

const DAY_KEYS: (keyof Omit<CalendarWeek, "weekNumber">)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CONTENT_TYPE_COLORS: Record<string, string> = {
  reel: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  story: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  tweet: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  video: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  carousel: "bg-green-500/20 text-green-300 border-green-500/30",
  post: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

function ContentTypeChip({ type }: { type: string }) {
  const colorClass = CONTENT_TYPE_COLORS[type] ?? "bg-rose-500/20 text-rose-300 border-rose-500/30";
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border ${colorClass} uppercase tracking-wide`}>
      {type}
    </span>
  );
}

function CalendarCell({
  entry,
  dayLabel,
  onExpand,
}: {
  entry: CalendarEntry;
  dayLabel: string;
  onExpand: () => void;
}) {
  return (
    <div
      className="bg-[#141414] border border-white/[0.06] rounded-lg p-2 cursor-pointer hover:border-rose-500/40 hover:bg-[#1a1a1a] transition-all group min-h-[96px] flex flex-col gap-1"
      onClick={onExpand}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold text-[#8a8580] uppercase">{dayLabel}</span>
        <ContentTypeChip type={entry.contentType} />
      </div>
      <p className="text-xs text-gray-300 line-clamp-2 flex-1">{entry.contentIdea}</p>
      <p className="text-[10px] text-rose-400/70">{entry.optimalPostingTime}</p>
      <p className="text-[10px] text-gray-600 group-hover:text-[#8a8580] transition-colors">
        Tap to expand
      </p>
    </div>
  );
}

function EntryModal({
  entry,
  dayLabel,
  weekNumber,
  onClose,
}: {
  entry: CalendarEntry;
  dayLabel: string;
  weekNumber: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/[0.06] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#8a8580] mb-0.5">
              Week {weekNumber} &middot; {dayLabel}
            </p>
            <h3 className="text-base font-semibold text-white">{entry.contentIdea}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a8580] hover:text-white transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <ContentTypeChip type={entry.contentType} />
          <span className="inline-block px-2 py-0.5 text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded">
            {entry.optimalPostingTime}
          </span>
          <span className={`inline-block px-2 py-0.5 text-[10px] border rounded ${
            entry.engagementPrediction.toLowerCase().includes("high")
              ? "bg-green-500/10 text-green-300 border-green-500/20"
              : entry.engagementPrediction.toLowerCase().includes("low")
              ? "bg-red-500/10 text-red-300 border-red-500/20"
              : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
          }`}>
            {entry.engagementPrediction}
          </span>
        </div>

        {/* Caption Draft */}
        <div>
          <p className="text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">Caption Draft</p>
          <div className="bg-[#141414] rounded-lg p-3 relative">
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{entry.captionDraft}</p>
            <button
              onClick={() => navigator.clipboard.writeText(entry.captionDraft)}
              className="absolute top-2 right-2 text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Hashtags */}
        {entry.hashtags.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">Hashtags</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-pink-500/10 text-pink-300 border border-pink-500/20 rounded cursor-pointer hover:bg-pink-500/20 transition-colors"
                  onClick={() => navigator.clipboard.writeText(tag)}
                  title="Click to copy"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Media Suggestion */}
        <div>
          <p className="text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">Media Suggestion</p>
          <div className="bg-[#1a1a1a]/30 rounded-lg p-3">
            <p className="text-sm text-gray-300">{entry.mediaSuggestion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildExportText(calendar: ContentCalendarReport): string {
  return calendar.weeks
    .map((week) => {
      const weekHeader = `=== WEEK ${week.weekNumber} ===`;
      const days = DAY_KEYS.map((key, i) => {
        const entry = week[key] as CalendarEntry;
        return `${DAY_LABELS[i].toUpperCase()}:\nIdea: ${entry.contentIdea}\nType: ${entry.contentType}\nTime: ${entry.optimalPostingTime}\nCaption: ${entry.captionDraft}\nHashtags: ${entry.hashtags.join(" ")}\nMedia: ${entry.mediaSuggestion}`;
      }).join("\n\n");
      return `${weekHeader}\n\n${days}`;
    })
    .join("\n\n\n");
}

export default function ContentCalendar({ platform, username, report }: Props) {
  const [state, setState] = useState<State>("idle");
  const [calendar, setCalendar] = useState<ContentCalendarReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<{
    entry: CalendarEntry;
    dayLabel: string;
    weekNumber: number;
  } | null>(null);
  const [exported, setExported] = useState(false);

  async function handleGenerate() {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username, analysisReport: report }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.calendar) {
        setError(data.error ?? "Failed to generate calendar. Please try again.");
        setState("idle");
        return;
      }

      setCalendar(data.calendar);
      setState("result");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("idle");
    }
  }

  async function handleExport() {
    if (!calendar) return;
    await navigator.clipboard.writeText(buildExportText(calendar));
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-gray-400">Generating your 30-day calendar...</p>
      </div>
    );
  }

  if (state === "result" && calendar) {
    return (
      <div className="space-y-6">
        {/* Modal */}
        {expandedEntry && (
          <EntryModal
            entry={expandedEntry.entry}
            dayLabel={expandedEntry.dayLabel}
            weekNumber={expandedEntry.weekNumber}
            onClose={() => setExpandedEntry(null)}
          />
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold gradient-text">30-Day Content Calendar</h2>
            <p className="text-xs text-[#8a8580] mt-0.5">
              @{calendar.username} &middot; {calendar.niche} &middot;{" "}
              {new Date(calendar.generatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="text-xs border border-white/[0.06] text-gray-400 hover:text-white hover:border-gray-600 transition-colors px-3 py-1.5 rounded-lg"
            >
              {exported ? "Copied!" : "Export All"}
            </button>
            <button
              onClick={() => { setState("idle"); setCalendar(null); }}
              className="text-xs border border-white/[0.06] text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
            >
              Regenerate
            </button>
          </div>
        </div>

        {/* Weeks */}
        {calendar.weeks.map((week) => (
          <div key={week.weekNumber} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Week {week.weekNumber}
            </h3>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_KEYS.map((key, i) => (
                <CalendarCell
                  key={key}
                  entry={week[key] as CalendarEntry}
                  dayLabel={DAY_LABELS[i]}
                  onExpand={() =>
                    setExpandedEntry({
                      entry: week[key] as CalendarEntry,
                      dayLabel: `${DAY_LABELS[i]}, Week ${week.weekNumber}`,
                      weekNumber: week.weekNumber,
                    })
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold gradient-text">Content Calendar</h2>
        <p className="text-sm text-gray-400 mt-1">
          Generate a 30-day content plan tailored to @{username}&apos;s niche and audience.
        </p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 sm:p-8 card-glow flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Generate 30-Day Content Calendar</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            AI-powered weekly grid with content ideas, optimal posting times, caption drafts, and hashtags.
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleGenerate}
          className="px-8 py-3 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Generate Calendar
        </button>
      </div>
    </div>
  );
}
