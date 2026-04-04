"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, ChevronDown } from "lucide-react";
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.05] transition-all duration-200"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-[10px] font-bold text-white select-none ring-2 ring-rose-500/20">
          {initials}
        </div>
        <span className="hidden sm:block text-[13px] text-[#e8e4df] max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown size={13} className="text-[#8a8580]" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.06] bg-[#141414] shadow-2xl shadow-black/40 z-50 py-1 text-sm backdrop-blur-xl">
          <div className="px-3 py-2.5 text-xs text-[#8a8580] truncate border-b border-white/[0.06]">
            {email}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
          >
            <Settings size={14} className="text-[#8a8580]" />
            <span className="text-[#e8e4df]">Settings</span>
          </button>

          <div className="border-t border-white/[0.06] my-0.5" />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left text-[#8a8580] hover:text-[#e8e4df]"
          >
            <LogOut size={14} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
