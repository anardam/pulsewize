import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { UserMenu } from "./UserMenu";

interface TopNavProps {
  activePath?: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analyze", href: "/analyze" },
  { label: "Reports", href: "/reports" },
];

export async function TopNav({ activePath }: TopNavProps) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d0d]/80 border-b border-white/[0.06]">
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between h-14 px-6">
        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 flex-shrink-0 group"
        >
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white tracking-tight">SL</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#e8e4df] group-hover:text-white transition-colors">
            SocialLens
          </span>
        </Link>

        {/* Authenticated nav links */}
        {user && (
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  activePath === item.href
                    ? "text-[#e8e4df] bg-white/[0.07]"
                    : "text-[#8a8580] hover:text-[#e8e4df] hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu email={user.email ?? ""} />
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#8a8580] hover:text-[#e8e4df] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-lg text-[13px] font-medium bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
