"use client";

import { useState, type ElementType } from "react";
import Image from "next/image";
import { FaFacebookF, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { Link2, RefreshCcw, Sparkles } from "lucide-react";

interface ConnectedAccount {
  id: string;
  platform: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  connected_at: string;
  last_synced_at: string | null;
}

interface Props {
  accounts: ConnectedAccount[];
  onAnalyzeConnected: (account: ConnectedAccount) => void;
}

const CONNECT_OPTIONS = [
  { platform: "instagram", label: "Instagram", href: "/api/connections/instagram/start" },
  { platform: "facebook", label: "Facebook", href: "/api/connections/facebook/start" },
  { platform: "youtube", label: "YouTube", href: "/api/connections/youtube/start" },
];

const PLATFORM_META: Record<string, { label: string; color: string; icon: ElementType }> = {
  instagram: { label: "Instagram", color: "#E1306C", icon: FaInstagram },
  facebook: { label: "Facebook", color: "#1877F2", icon: FaFacebookF },
  twitter: { label: "X", color: "#f5efe7", icon: FaXTwitter },
  youtube: { label: "YouTube", color: "#FF0000", icon: FaYoutube },
};

export function ConnectedAccountsPanel({
  accounts,
  onAnalyzeConnected,
}: Props) {
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [localAccounts, setLocalAccounts] = useState(accounts);

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    try {
      const response = await fetch(`/api/connections/${id}/refresh`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setLocalAccounts((current) =>
          current.map((account) =>
            account.id === id
              ? { ...account, last_synced_at: data.data.lastSyncedAt, status: "active" }
              : account
          )
        );
      }
    } finally {
      setRefreshingId(null);
    }
  }

  if (localAccounts.length === 0) {
    return (
      <div className="rounded-[32px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(225,70,124,0.12),transparent_34%),linear-gradient(180deg,rgba(24,24,24,0.98),rgba(14,14,14,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:p-7">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/80">
          Owned accounts
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#f5efe7]">
          Connect your owned accounts
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#a59e97]">
          Use official account data for the profiles you control, then keep public-profile
          analysis for competitors and one-off reads.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {CONNECT_OPTIONS.map((option) => (
            <a
              key={option.platform}
              href={option.href}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-5 py-3 text-sm font-semibold text-[#f5efe7] transition-all hover:border-white/[0.14] hover:bg-white/[0.08]"
            >
              <Link2 size={15} />
              Connect {option.label}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(225,70,124,0.12),transparent_34%),linear-gradient(180deg,rgba(24,24,24,0.98),rgba(14,14,14,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400/80">
            Owned accounts
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f5efe7]">
            Official account data
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#a59e97]">
            Refresh connected accounts and analyze them without relying on public scraping.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONNECT_OPTIONS.map((option) => (
            <a
              key={option.platform}
              href={option.href}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm text-[#f5efe7] transition-all hover:border-white/[0.14] hover:bg-white/[0.05]"
            >
              <Link2 size={14} />
              Connect {option.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {localAccounts.map((account) => (
          <div
            key={account.id}
            className="flex h-full flex-col justify-between gap-6 rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,19,19,0.94),rgba(10,10,10,0.92))] p-5 shadow-[0_20px_48px_rgba(0,0,0,0.18)]"
          >
            {(() => {
              const displayUsername = account.username?.replace(/^@+/, "") ?? null;
              const meta = PLATFORM_META[account.platform] ?? PLATFORM_META.youtube;
              const Icon = meta.icon;

              return (
          <>
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {account.avatar_url ? (
                    <Image
                      src={account.avatar_url}
                      alt={account.display_name ?? "Connected account"}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-[20px] object-cover ring-1 ring-white/[0.08]"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-red-500/10 text-red-300 ring-1 ring-white/[0.08]">
                      <Sparkles size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold tracking-tight text-[#f5efe7]">
                      {account.display_name ?? account.username ?? `${meta.label} account`}
                    </p>
                    <p className="mt-1 text-sm text-[#8f877f]">
                      {displayUsername ? `@${displayUsername}` : "Connected account"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
                    style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                  >
                    <Icon size={11} />
                    {meta.label}
                  </span>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                    {account.status}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                    Sync state
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#e8e4df]">
                    {account.last_synced_at ? "Fresh account data" : "Awaiting first sync"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                    Last synced
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#e8e4df]">
                    {account.last_synced_at
                      ? new Date(account.last_synced_at).toLocaleString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleRefresh(account.id)}
                disabled={refreshingId === account.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-[#f5efe7] transition-all hover:border-white/[0.14] hover:bg-white/[0.05] disabled:opacity-60"
              >
                <RefreshCcw size={14} className={refreshingId === account.id ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={() => onAnalyzeConnected(account)}
                className="inline-flex items-center gap-2 rounded-full bg-[#f5efe7] px-4 py-2.5 text-sm font-semibold text-[#111111] transition-transform hover:-translate-y-0.5"
              >
                <Sparkles size={14} />
                Analyze account
              </button>
            </div>
          </>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
