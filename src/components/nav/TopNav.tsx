import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { UserMenu } from "./UserMenu";

interface TopNavProps {
  activePath?: string;
}

export async function TopNav({ activePath }: TopNavProps) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

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
              Pulsewize
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

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d0d]/80 border-b border-white/[0.04]">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white tracking-tight">SL</span>
          </div>
          <div className="hidden sm:block">
            <span className="block text-sm font-semibold tracking-tight text-[#e8e4df] group-hover:text-white transition-colors">
              Pulsewize
            </span>
            <span className="block text-[11px] text-[#726b65]">
              Home for analysis, reports, and settings
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <UserMenu email={user.email ?? ""} isAdmin={isAdmin} />
        </div>
      </div>
    </nav>
  );
}
