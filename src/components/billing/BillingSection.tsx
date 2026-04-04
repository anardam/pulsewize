"use client";

import { useState } from "react";
import { UpgradePrompt } from "./UpgradePrompt";
import { CancelDialog } from "./CancelDialog";

interface RazorpayInvoice {
  id: string;
  amount: number; // paise/cents — divide by 100 for display
  currency: string;
  status: string; // "captured" | "failed" | "refunded"
  createdAt: number; // Unix timestamp (seconds)
}

interface BillingSectionProps {
  plan: "free" | "pro";
  status: string;
  analysesUsed: number;
  currentPeriodEnd: string | null;
  providerSubscriptionId: string | null;
  invoices: RazorpayInvoice[];
}

export function BillingSection({
  plan,
  status,
  analysesUsed,
  currentPeriodEnd,
  providerSubscriptionId,
  invoices,
}: BillingSectionProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isPro = plan === "pro";
  const isHalted = status === "halted";

  async function handleCancel() {
    const res = await fetch("/api/subscriptions/cancel", { method: "POST" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? "Cancellation failed");
    window.location.reload();
  }

  return (
    <div className="mt-4 bg-[#111118] border border-white/[0.08] rounded-xl p-6">
      <h2 className="text-base font-semibold">Billing</h2>

      <div className="mt-4 space-y-4">
        {/* Current plan */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Current plan</label>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              isPro
                ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                : "border-white/[0.12] text-[#ededed]"
            }`}
          >
            {isPro ? "Pro" : "Free"}
          </span>
          {isHalted && (
            <p className="mt-1 text-xs text-amber-400">
              Payment issue detected. Update your payment method to continue Pro access.
            </p>
          )}
        </div>

        {/* Usage */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Analyses this month</label>
          <p className="text-sm text-muted-foreground">
            {isPro ? (
              <span>{analysesUsed} used — unlimited remaining</span>
            ) : (
              <span>
                {analysesUsed} of 3 used — {Math.max(0, 3 - analysesUsed)} remaining
              </span>
            )}
          </p>
        </div>

        {/* Period end (Pro only) */}
        {isPro && currentPeriodEnd && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Next billing date</label>
            <p className="text-sm text-muted-foreground">
              {new Date(currentPeriodEnd).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}

        {/* Payment history (D-13) — invoice list with date, amount, status */}
        {invoices.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Payment history</label>
            <div className="space-y-1.5">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <span className="text-sm text-muted-foreground">
                    {new Date(invoice.createdAt * 1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-[#ededed]">
                    {invoice.currency.toUpperCase()} {(invoice.amount / 100).toFixed(2)}
                  </span>
                  <span
                    className={`text-xs capitalize ${
                      invoice.status === "captured"
                        ? "text-emerald-400"
                        : invoice.status === "failed"
                          ? "text-red-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {invoice.status === "captured" ? "paid" : invoice.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upgrade prompt (free users only) */}
      {!isPro && (
        <div className="mt-4">
          <UpgradePrompt />
        </div>
      )}

      {/* Cancel subscription (Pro users only) */}
      {isPro && providerSubscriptionId && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => setShowCancelDialog(true)}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel subscription
          </button>
        </div>
      )}

      <CancelDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
      />
    </div>
  );
}
