"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Duration = "once" | "forever" | "repeating";

export function AdminCouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("100");
  const [duration, setDuration] = useState<Duration>("once");
  const [durationInMonths, setDurationInMonths] = useState("3");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            percentOff: Number(percentOff),
            duration,
            durationInMonths:
              duration === "repeating" ? Number(durationInMonths) : undefined,
            maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
          }),
        });

        const data = (await response.json()) as {
          success?: boolean;
          error?: string;
          promotionCode?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "Coupon creation failed");
        }

        setMessage(
          data.promotionCode
            ? `Promotion code ${data.promotionCode} created`
            : "Coupon created"
        );
        setCode("");
        setPercentOff("100");
        setDuration("once");
        setDurationInMonths("3");
        setMaxRedemptions("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Coupon creation failed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-white/[0.06] bg-[#141414] p-5">
      <div>
        <p className="text-sm font-semibold text-[#f3eee8]">Create promotion code</p>
        <p className="mt-1 text-sm text-[#8f877f]">
          Build Stripe discounts here. A 100% off code can act as a waived subscription without
          forcing a manual plan override.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.14em] text-[#6f6963]">Code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s+/g, ""))}
            placeholder="FOUNDER100"
            className="w-full rounded-2xl border border-white/[0.08] bg-[#101010] px-4 py-3 text-sm text-[#f3eee8] outline-none transition-colors placeholder:text-[#746c65] focus:border-rose-400/40"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.14em] text-[#6f6963]">Percent off</span>
          <input
            type="number"
            min="1"
            max="100"
            value={percentOff}
            onChange={(event) => setPercentOff(event.target.value)}
            className="w-full rounded-2xl border border-white/[0.08] bg-[#101010] px-4 py-3 text-sm text-[#f3eee8] outline-none transition-colors focus:border-rose-400/40"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.14em] text-[#6f6963]">Duration</span>
          <select
            value={duration}
            onChange={(event) => setDuration(event.target.value as Duration)}
            className="w-full rounded-2xl border border-white/[0.08] bg-[#101010] px-4 py-3 text-sm text-[#f3eee8] outline-none transition-colors focus:border-rose-400/40"
          >
            <option value="once">Once</option>
            <option value="forever">Forever</option>
            <option value="repeating">Repeating</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.14em] text-[#6f6963]">
            Max redemptions
          </span>
          <input
            type="number"
            min="1"
            value={maxRedemptions}
            onChange={(event) => setMaxRedemptions(event.target.value)}
            placeholder="Optional"
            className="w-full rounded-2xl border border-white/[0.08] bg-[#101010] px-4 py-3 text-sm text-[#f3eee8] outline-none transition-colors placeholder:text-[#746c65] focus:border-rose-400/40"
          />
        </label>

        {duration === "repeating" ? (
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-[#6f6963]">
              Duration in months
            </span>
            <input
              type="number"
              min="1"
              value={durationInMonths}
              onChange={(event) => setDurationInMonths(event.target.value)}
              className="w-full rounded-2xl border border-white/[0.08] bg-[#101010] px-4 py-3 text-sm text-[#f3eee8] outline-none transition-colors focus:border-rose-400/40"
            />
          </label>
        ) : null}
      </div>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#111111] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create coupon"}
      </button>
    </form>
  );
}
