"use client";

import { useState } from "react";

interface CancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function CancelDialog({ isOpen, onClose, onConfirm }: CancelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#111118] p-6">
        <h3 className="text-base font-semibold text-[#ededed]">Cancel subscription?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your Pro access continues until the end of the current billing period.
          After that, your account reverts to the free tier (3 analyses/month).
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-[#ededed] hover:bg-white/[0.04] disabled:opacity-60 transition-colors"
          >
            Keep subscription
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {isLoading ? "Cancelling..." : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
