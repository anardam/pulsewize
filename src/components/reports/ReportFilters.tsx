"use client";

// src/components/reports/ReportFilters.tsx
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

interface ReportFiltersProps {
  platform: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

export function ReportFilters({
  platform,
  search,
  dateFrom,
  dateTo,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      Object.entries(overrides).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      return `?${params.toString()}`;
    },
    [searchParams]
  );

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(buildUrl({ platform: e.target.value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ search: value }));
    }, 300);
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(buildUrl({ dateFrom: e.target.value }));
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(buildUrl({ dateTo: e.target.value }));
  };

  // cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const controlClass =
    "bg-[#111118] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#ededed] focus:outline-none focus:border-violet-500/50 transition-colors";

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {/* Platform dropdown */}
      <select
        value={platform}
        onChange={handlePlatformChange}
        className={controlClass}
        aria-label="Filter by platform"
      >
        <option value="">All Platforms</option>
        <option value="instagram">Instagram</option>
        <option value="twitter">Twitter</option>
        <option value="tiktok">TikTok</option>
        <option value="youtube">YouTube</option>
        <option value="linkedin">LinkedIn</option>
        <option value="facebook">Facebook</option>
      </select>

      {/* Search by handle */}
      <input
        type="text"
        placeholder="Search by handle…"
        defaultValue={search}
        onChange={handleSearchChange}
        className={`${controlClass} min-w-[180px]`}
        aria-label="Search by handle"
      />

      {/* Date From */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground" htmlFor="dateFrom">
          From
        </label>
        <input
          id="dateFrom"
          type="date"
          value={dateFrom}
          onChange={handleDateFromChange}
          className={controlClass}
          aria-label="Filter from date"
        />
      </div>

      {/* Date To */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground" htmlFor="dateTo">
          To
        </label>
        <input
          id="dateTo"
          type="date"
          value={dateTo}
          onChange={handleDateToChange}
          className={controlClass}
          aria-label="Filter to date"
        />
      </div>
    </div>
  );
}
