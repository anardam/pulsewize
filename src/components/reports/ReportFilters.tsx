"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

interface Props {
  platform: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

export function ReportFilters({ platform, search, dateFrom, dateTo }: Props) {
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const inputClass =
    "bg-[#141414] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-[#e8e4df] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/30 transition-all duration-200 placeholder:text-[#5a5550]";

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5550]" />
        <input
          type="text"
          placeholder="Search by handle..."
          defaultValue={search}
          onChange={handleSearchChange}
          className={`${inputClass} pl-10 w-full`}
          aria-label="Search by handle"
        />
      </div>
      <div className="relative">
        <SlidersHorizontal size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5550] pointer-events-none" />
        <select
          value={platform}
          onChange={handlePlatformChange}
          className={`${inputClass} pl-9 pr-8 appearance-none cursor-pointer`}
          aria-label="Filter by platform"
        >
          <option value="">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="twitter">Twitter/X</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={handleDateFromChange}
          className={`${inputClass} w-[140px]`}
          aria-label="From date"
        />
        <span className="text-[11px] text-[#5a5550]">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={handleDateToChange}
          className={`${inputClass} w-[140px]`}
          aria-label="To date"
        />
      </div>
    </div>
  );
}
