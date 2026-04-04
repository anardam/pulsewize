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
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.06] transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="h-7 w-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-semibold text-white select-none">
          {initials}
        </div>
        <span className="hidden sm:block text-sm text-[#ededed] max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#111118] shadow-xl z-50 py-1 text-sm">
          {/* Email label */}
          <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-white/[0.08]">
            {email}
          </div>

          {/* Settings */}
          <button
            onClick={() => { setOpen(false); router.push("/settings"); }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left"
          >
            <Settings size={15} className="text-muted-foreground" />
            <span>Settings</span>
          </button>

          <div className="border-t border-white/[0.08] my-1" />

          {/* Log out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left text-muted-foreground hover:text-[#ededed]"
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
