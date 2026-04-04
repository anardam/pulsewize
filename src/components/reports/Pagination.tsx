"use client";

// src/components/reports/Pagination.tsx
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
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

  const buttonClass =
    "px-3 py-1.5 rounded-lg text-sm border border-white/[0.08] bg-[#111118] disabled:opacity-40 hover:border-violet-500/30 transition-colors disabled:cursor-not-allowed";

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => navigateTo(page - 1)}
        disabled={page <= 1}
        className={buttonClass}
        aria-label="Previous page"
      >
        Previous
      </button>

      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => navigateTo(page + 1)}
        disabled={page >= totalPages}
        className={buttonClass}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}
