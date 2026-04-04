import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Get started — SocialLens" };

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-fade-up">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
            <span className="text-[11px] font-bold text-white">SL</span>
          </div>
          <span className="text-sm font-semibold text-[#e8e4df]">SocialLens</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-[#8a8580] mt-1.5">
            Start with 3 free analyses every month
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-7">
          <AuthForm mode="signup" />
        </div>
      </div>
    </div>
  );
}
