"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  email: string;
  plan: "free" | "pro";
}

export function AdminSubscriptionControls({ userId, email, plan }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: "grant_pro" | "set_free") {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, action }),
        });
        const data = (await response.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "Admin action failed");
        }

        setMessage(
          action === "grant_pro"
            ? `Granted Pro access to ${email}`
            : `Returned ${email} to Free`
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Admin action failed");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {plan === "pro" ? (
          <button
            type="button"
            onClick={() => runAction("set_free")}
            disabled={isPending}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#e8e4df] transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Updating..." : "Return to Free"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => runAction("grant_pro")}
            disabled={isPending}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-[#04140c] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Granting..." : "Grant Pro"}
          </button>
        )}
      </div>

      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
