"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Props {
  currentEmail: string;
}

export function PasswordUpdateSection({ currentEmail }: Props) {
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const emailChanged = email.trim() !== currentEmail;
    const passwordChanged = password.length > 0;

    if (!emailChanged && !passwordChanged) {
      setError("No changes to save");
      return;
    }
    if (passwordChanged && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (passwordChanged && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const supabase = createSupabaseBrowser();
      const updates: { email?: string; password?: string } = {};
      if (emailChanged) updates.email = email.trim();
      if (passwordChanged) updates.password = password;

      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      if (emailChanged) {
        setSuccess("Confirmation email sent to your new address. Check your inbox.");
      } else {
        setSuccess("Password updated successfully.");
      }
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 bg-[#111118] border border-white/[0.08] rounded-xl p-6">
      <h2 className="text-base font-semibold">Email &amp; Password</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-[#0a0a0f] text-sm text-[#ededed] focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-[#0a0a0f] text-sm text-[#ededed] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-[#0a0a0f] text-sm text-[#ededed] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Update credentials"}
        </button>
      </form>
    </div>
  );
}
