// src/app/(dashboard)/settings/page.tsx
import { createSupabaseServer } from "@/lib/supabase/server";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";
import { BillingSection } from "@/components/billing/BillingSection";
import { ProfileEditSection } from "@/components/settings/ProfileEditSection";
import { PasswordUpdateSection } from "@/components/settings/PasswordUpdateSection";
import { getStripe } from "@/lib/stripe/server";
import type { Metadata } from "next";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa6";

export const metadata: Metadata = { title: "Settings — Pulsewize" };

interface BillingInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
}

const CONNECTION_CARDS = [
  {
    platform: "instagram",
    label: "Instagram",
    href: "/api/connections/instagram/start",
    accent: "#E1306C",
    icon: FaInstagram,
  },
  {
    platform: "facebook",
    label: "Facebook",
    href: "/api/connections/facebook/start",
    accent: "#1877F2",
    icon: FaFacebookF,
  },
  {
    platform: "youtube",
    label: "YouTube",
    href: "/api/connections/youtube/start",
    accent: "#FF0000",
    icon: FaYoutube,
  },
] as const;

export default async function SettingsPage() {
  const usageLimitsDisabled = process.env.NEXT_PUBLIC_DISABLE_USAGE_LIMITS === "true";
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user?.id ?? "")
    .single();

  // Fetch subscription state
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, provider, status, current_period_end, provider_subscription_id")
    .eq("user_id", user?.id ?? "")
    .single();

  // Fetch current month usage
  const billingMonth = new Date().toISOString().slice(0, 7) + "-01"; // YYYY-MM-01
  const { data: usage } = await supabase
    .from("usage")
    .select("analyses_used")
    .eq("user_id", user?.id ?? "")
    .eq("billing_month", billingMonth)
    .single();

  let invoices: BillingInvoice[] = [];
  if (subscription?.provider === "stripe" && subscription?.provider_subscription_id) {
    try {
      const stripe = getStripe();
      const paymentHistory = await stripe.invoices.list({
        subscription: subscription.provider_subscription_id,
        limit: 10,
      });
      invoices = paymentHistory.data.map((invoice) => {
        return {
          id: invoice.id,
          amount: invoice.amount_paid || invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status ?? "open",
          createdAt: invoice.created,
        };
      });
    } catch {
      invoices = [];
    }
  }

  const plan = (subscription?.plan ?? "free") as "free" | "pro";
  const analysesUsed = usage?.analyses_used ?? 0;
  const { data: connectedAccounts } = await supabase
    .from("connected_accounts")
    .select("id, platform, display_name, username, status, last_synced_at")
    .eq("user_id", user?.id ?? "")
    .order("connected_at", { ascending: false });

  const accountsByPlatform = new Map(
    (connectedAccounts ?? []).map((account) => [account.platform, account])
  );

  return (
    <>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Settings</h1>

          {/* Profile edit section — display name and avatar */}
          <ProfileEditSection
            userId={user?.id ?? ""}
            initialDisplayName={profile?.display_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />

          <div className="mt-6 bg-[#141414] border border-white/[0.06] rounded-xl p-6">
            <div>
              <div>
                <h2 className="text-base font-semibold">Connected accounts</h2>
                <p className="mt-1 text-sm text-[#8a8580]">
                  Use official platform data for your own accounts and keep public-profile analysis for competitors.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {CONNECTION_CARDS.map((item) => {
                const account = accountsByPlatform.get(item.platform);
                const isConnected = Boolean(account);
                const Icon = item.icon;
                const displayUsername = account?.username?.replace(/^@+/, "") ?? null;

                return (
                  <div
                    key={item.platform}
                    className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                          style={{
                            backgroundColor: `${item.accent}14`,
                            borderColor: `${item.accent}28`,
                          }}
                        >
                          <Icon size={18} style={{ color: item.accent }} />
                        </div>
                        <p className="mt-4 text-lg font-semibold text-[#e8e4df]">
                          {item.label}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                              isConnected
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : "border-white/[0.08] bg-white/[0.03] text-[#8a8580]"
                            }`}
                          >
                            {isConnected ? "Connected" : "Not connected"}
                          </span>
                          {account?.status && (
                            <span className="text-xs text-[#6f6963]">
                              {account.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                          Account
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#e8e4df]">
                          {account?.display_name ?? displayUsername ?? `No ${item.label} account linked`}
                        </p>
                        {displayUsername && (
                          <p className="mt-1 text-xs text-[#8a8580]">@{displayUsername}</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                          Last synced
                        </p>
                        <p className="mt-1 text-sm text-[#c7c1ba]">
                          {account?.last_synced_at
                            ? new Date(account.last_synced_at).toLocaleString()
                            : "Not synced yet"}
                        </p>
                      </div>

                      <a
                        href={item.href}
                        className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors"
                        style={{
                          backgroundColor: isConnected ? `${item.accent}20` : item.accent,
                          color: "#ffffff",
                        }}
                      >
                        {isConnected ? `Reconnect ${item.label}` : `Connect ${item.label}`}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account info card */}
          <div className="mt-6 bg-[#141414] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-base font-semibold">Account</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#0d0d0d] text-sm text-[#8a8580] cursor-default"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Plan</label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    plan === "pro"
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                      : "border-white/[0.08] text-[#e8e4df]"
                  }`}
                >
                  {plan === "pro" ? "Pro" : "Free"}
                </span>
              </div>
            </div>
          </div>

          {/* Email and password update section */}
          <PasswordUpdateSection currentEmail={user?.email ?? ""} />

          {/* Billing section — plan, usage, invoices, upgrade/cancel */}
          <BillingSection
            plan={plan}
            status={subscription?.status ?? "active"}
            analysesUsed={analysesUsed}
            usageLimitsDisabled={usageLimitsDisabled}
            currentPeriodEnd={subscription?.current_period_end ?? null}
            providerSubscriptionId={subscription?.provider_subscription_id ?? null}
            invoices={invoices}
          />

          {/* Danger zone card */}
          <div className="mt-4 bg-[#141414] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-base font-semibold text-red-400">Danger zone</h2>
            <div className="mt-4">
              <DeleteAccountButton />
            </div>
          </div>
    </>
  );
}
