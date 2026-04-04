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
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 h-16 bg-[#111118] border-b border-white/[0.08] flex items-center px-6">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex-shrink-0">
          <span className="text-sm font-semibold gradient-text">InstaAnalyse</span>
        </Link>

        {/* Authenticated nav links */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activePath === item.href
                    ? "bg-white/[0.08] text-[#ededed]"
                    : "text-muted-foreground hover:text-[#ededed] hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* Actions: UserMenu or auth buttons */}
        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu email={user.email ?? ""} />
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-[#ededed] hover:bg-white/[0.06] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
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
