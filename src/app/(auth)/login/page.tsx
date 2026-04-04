// src/app/(auth)/login/page.tsx
import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log in — SocialLens" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#111118] border border-white/[0.08] rounded-xl p-8 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Log in</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back</p>
        </div>
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
