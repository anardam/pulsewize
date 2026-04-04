import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { UserMenu } from "./UserMenu";

interface TopNavProps {
  activePath?: string;
}

export async function TopNav({ activePath }: TopNavProps) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public nav — minimal header for landing/auth pages
  if (!user) {
    return (
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d0d]/80 border-b border-white/[0.04]">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white tracking-tight">SL</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#e8e4df] group-hover:text-white transition-colors">
              SocialLens
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#8a8580] hover:text-[#e8e4df] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Authenticated nav — clean minimal bar
  const isAnalyze = activePath === "/analyze";

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d0d]/80 border-b border-white/[0.04]">
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
        {/* Logo — links to dashboard */}
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white tracking-tight">SL</span>
          </div>
          <span className="hidden sm:block text-sm font-semibold tracking-tight text-[#e8e4df] group-hover:text-white transition-colors">
            SocialLens
          </span>
        </Link>

        {/* Right side: Analyze CTA + User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isAnalyze && (
            <Link
              href="/analyze"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span className="hidden sm:inline">Analyze</span>
            </Link>
          )}
          <UserMenu email={user.email ?? ""} />
        </div>
      </div>
    </nav>
  );
}
