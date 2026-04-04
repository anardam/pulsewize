"use client";

import { useState } from "react";
import Script from "next/script";

export function UpgradePrompt() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();

      if (!data.success || !data.subscriptionId) {
        throw new Error(data.error ?? "Could not initiate checkout");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscriptionId, // NOT order_id
        name: "InstaAnalyse",
        description: "Pro Plan — Unlimited Analyses",
        theme: { color: "#7c3aed" },
        handler: function () {
          // Advisory only — D-10: client callback MUST NOT set plan state
          // Webhook is the source of truth; reload to pick up updated status
          window.location.reload();
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      });
      rzp.open();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* checkout.js loaded via next/script — App Router safe, deduplicated */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 text-center">
        <div className="mb-1 text-sm font-medium text-violet-400">
          You&apos;ve used all 3 free analyses this month
        </div>
        <h3 className="text-lg font-semibold text-[#ededed]">
          Unlock unlimited analyses
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Upgrade to Pro for $19.99/month — unlimited analyses across all 6
          platforms.
        </p>

        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          <li>Unlimited analyses every month</li>
          <li>All 6 platforms supported</li>
          <li>Full AI-powered insights</li>
          <li>Multi-agent reports (coming soon)</li>
        </ul>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {isLoading ? "Opening checkout..." : "Upgrade to Pro"}
        </button>

        <p className="mt-3 text-xs text-muted-foreground">
          Cancel anytime from Settings. Powered by Razorpay.
        </p>
      </div>
    </>
  );
}
