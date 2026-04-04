// src/app/(auth)/signup/page.tsx
import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Get started — SocialLens" };

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#111118] border border-white/[0.08] rounded-xl p-8 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Get started</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your free account</p>
        </div>
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
