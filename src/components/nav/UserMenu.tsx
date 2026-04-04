"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Settings, LogOut, ChevronDown, FileText } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Props {
  email: string;
}

export function UserMenu({ email }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = email.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.05] transition-all duration-200"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-[11px] font-bold text-white select-none ring-2 ring-rose-500/20">
          {initials}
        </div>
        <ChevronDown
          size={13}
          className={`text-[#5a5550] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 mt-2 w-60 rounded-xl border border-white/[0.06] bg-[#141414] shadow-2xl shadow-black/50 z-50 py-1.5 text-sm overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/[0.04]">
              <p className="text-sm font-medium text-[#e8e4df] truncate">{displayName}</p>
              <p className="text-xs text-[#5a5550] truncate mt-0.5">{email}</p>
            </div>

            {/* Navigation */}
            <div className="py-1">
              {menuItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <item.icon size={15} className="text-[#8a8580]" />
                  <span className="text-[#e8e4df]">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-white/[0.04] mt-0.5 pt-0.5">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left text-[#8a8580] hover:text-[#e8e4df]"
              >
                <LogOut size={15} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
