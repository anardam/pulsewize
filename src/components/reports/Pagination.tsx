"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateTo = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => navigateTo(page - 1)}
        disabled={page <= 1}
        className="h-9 w-9 rounded-lg border border-white/[0.06] bg-[#141414] flex items-center justify-center disabled:opacity-30 hover:border-rose-500/20 hover:bg-white/[0.03] transition-all duration-200 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft size={15} className="text-[#8a8580]" />
      </button>

      <div className="flex items-center gap-1 px-2">
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const pageNum = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
          return (
            <button
              key={pageNum}
              onClick={() => navigateTo(pageNum)}
              className={`h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                pageNum === page
                  ? "bg-rose-600 text-white"
                  : "text-[#8a8580] hover:text-[#e8e4df] hover:bg-white/[0.04]"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => navigateTo(page + 1)}
        disabled={page >= totalPages}
        className="h-9 w-9 rounded-lg border border-white/[0.06] bg-[#141414] flex items-center justify-center disabled:opacity-30 hover:border-rose-500/20 hover:bg-white/[0.03] transition-all duration-200 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight size={15} className="text-[#8a8580]" />
      </button>
    </div>
  );
}
