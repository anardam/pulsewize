"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (oauthError) {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address above, then click Forgot password.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
      }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message ?? "Failed to send reset email.");
    } else {
      setForgotSent(true);
      setSuccess("Check your inbox for a reset link.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createSupabaseBrowser();

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(
          signInError.message.includes("Email not confirmed")
            ? "Check your inbox to verify your email before logging in."
            : "Incorrect email or password. Please try again."
        );
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("An account with this email already exists. Log in instead.");
        } else if (signUpError.message.includes("Password should be")) {
          setError("Password must be at least 8 characters.");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
      } else {
        setSuccess("Check your inbox to confirm your email.");
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/[0.1] text-sm font-medium text-[#e8e4df] hover:bg-white/[0.04] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[11px] text-[#8a8580] uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-[#8a8580] mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.1] bg-[#0d0d0d] text-sm text-[#e8e4df] placeholder:text-[#5a5550] focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 transition-all duration-200 disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-[#8a8580] mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : undefined}
            disabled={loading}
            className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.1] bg-[#0d0d0d] text-sm text-[#e8e4df] placeholder:text-[#5a5550] focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 transition-all duration-200 disabled:opacity-50"
          />
          {mode === "login" && !forgotSent && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="mt-2 text-xs text-rose-400/80 hover:text-rose-300 transition-colors disabled:opacity-50"
            >
              Forgot password?
            </button>
          )}
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {mode === "login" ? "Logging in..." : "Creating account..."}
            </span>
          ) : mode === "login" ? (
            "Log in"
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {mode === "signup" && (
        <p className="text-[11px] text-[#5a5550] text-center mt-1">
          By creating an account, you agree to our Terms of Service.
        </p>
      )}

      <p className="text-sm text-center text-[#8a8580] mt-2">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-rose-400 hover:text-rose-300 transition-colors">
              Get started
            </a>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <a href="/login" className="text-rose-400 hover:text-rose-300 transition-colors">
              Log in
            </a>
          </>
        )}
      </p>
    </div>
  );
}
