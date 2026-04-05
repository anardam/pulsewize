"use client";

import { useState } from "react";

export function UpgradePrompt() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();

      if (!data.success || !data.url) {
        throw new Error(data.error ?? "Could not initiate checkout");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
      <div className="mb-1 text-sm font-medium text-rose-400">
        You&apos;ve used all 3 free analyses this month
      </div>
      <h3 className="text-lg font-semibold text-[#e8e4df]">
        Unlock unlimited analyses
      </h3>
      <p className="mt-1.5 text-sm text-[#8a8580]">
        Upgrade to Pro for $19.99/month with promotion codes, recurring billing,
        and a cleaner subscription flow.
      </p>

      <ul className="mt-4 space-y-1 text-sm text-[#8a8580]">
        <li>Unlimited analyses every month</li>
        <li>Official connected-account data + public reads</li>
        <li>Promotion codes supported at checkout</li>
        <li>Cancel anytime from Settings</li>
      </ul>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleUpgrade}
        disabled={isLoading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
      >
        {isLoading ? "Opening checkout..." : "Upgrade to Pro"}
      </button>

      <p className="mt-3 text-xs text-[#8a8580]">
        Powered by Stripe.
      </p>
    </div>
  );
}
