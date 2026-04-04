"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, FileText, Settings, LayoutDashboard } from "lucide-react";

const ACTIONS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", color: "rose" },
  { href: "/analyze", icon: Search, label: "Analyze", color: "rose" },
  { href: "/reports", icon: FileText, label: "Reports", color: "blue" },
  { href: "/settings", icon: Settings, label: "Settings", color: "amber" },
];

const COLOR_MAP: Record<string, { bg: string; text: string; activeBg: string; activeBorder: string }> = {
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", activeBg: "bg-rose-500/15", activeBorder: "border-rose-500/30" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", activeBg: "bg-blue-500/15", activeBorder: "border-blue-500/30" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", activeBg: "bg-amber-500/15", activeBorder: "border-amber-500/30" },
};

export function QuickActions() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: horizontal action pills */}
      <div className="hidden sm:flex items-center gap-1.5 mb-8">
        {ACTIONS.map((action) => {
          const isActive = pathname === action.href || pathname.startsWith(action.href + "/");
          const colors = COLOR_MAP[action.color];

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border ${
                isActive
                  ? `${colors.activeBg} ${colors.activeBorder} ${colors.text}`
                  : "border-transparent text-[#8a8580] hover:text-[#e8e4df] hover:bg-white/[0.04]"
              }`}
            >
              <action.icon size={15} className={isActive ? colors.text : ""} />
              {action.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile: bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-16 px-2 pb-safe">
          {ACTIONS.map((action) => {
            const isActive = pathname === action.href || pathname.startsWith(action.href + "/");
            const colors = COLOR_MAP[action.color];

            return (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? colors.text
                    : "text-[#5a5550]"
                }`}
              >
                <action.icon size={20} />
                <span className="text-[10px] font-medium">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
