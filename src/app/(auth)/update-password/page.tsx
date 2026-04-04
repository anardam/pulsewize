// src/app/(auth)/update-password/page.tsx
// Reached after clicking the password reset email link.
// Supabase has already set the session via /api/auth/callback?next=/auth/update-password
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message ?? "Failed to update password. Please try again.");
      setLoading(false);
    } else {
      setSuccess(true);
      // Redirect to dashboard after short delay
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#111118] border border-white/[0.08] rounded-xl p-8 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {success
              ? "Password updated. Redirecting to dashboard…"
              : "Enter your new password below."}
          </p>
        </div>

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                New password
              </label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-[#0a0a0f] text-sm text-[#ededed] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                placeholder="Repeat your new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-[#0a0a0f] text-sm text-[#ededed] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating…
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}

        {success && (
          <div className="flex items-center justify-center py-4">
            <svg className="animate-spin h-5 w-5 text-violet-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
