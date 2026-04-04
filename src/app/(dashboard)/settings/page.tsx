// src/app/(dashboard)/settings/page.tsx
import { TopNav } from "@/components/nav/TopNav";
import { createSupabaseServer } from "@/lib/supabase/server";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";
import { BillingSection } from "@/components/billing/BillingSection";
import { ProfileEditSection } from "@/components/settings/ProfileEditSection";
import { PasswordUpdateSection } from "@/components/settings/PasswordUpdateSection";
import { razorpay } from "@/lib/razorpay/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings — SocialLens" };

interface RazorpayInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
}

export default async function SettingsPage() {
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
    .select("plan, status, current_period_end, provider_subscription_id")
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

  // Fetch payment history (D-13) — only for users with an active subscription
  // razorpay.payments.all() accepts subscription_id as a filter param
  let invoices: RazorpayInvoice[] = [];
  if (subscription?.provider_subscription_id) {
    try {
      const payments = await razorpay.payments.all({
        subscription_id: subscription.provider_subscription_id,
      } as Parameters<typeof razorpay.payments.all>[0]);
      invoices = ((payments as { items?: unknown[] }).items ?? []).map((p: unknown) => {
        const payment = p as {
          id: string;
          amount: number;
          currency: string;
          status: string;
          created_at: number;
        };
        return {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.created_at,
        };
      });
    } catch {
      // Non-fatal — show empty invoice list rather than breaking the page
      invoices = [];
    }
  }

  const plan = (subscription?.plan ?? "free") as "free" | "pro";
  const analysesUsed = usage?.analyses_used ?? 0;

  return (
    <>
      <TopNav activePath="/settings" />
      <main className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <h1 className="text-xl font-semibold">Settings</h1>

          {/* Tab navigation */}
          <div className="mt-6 border-b border-white/[0.08]">
            <button className="px-4 py-2 text-sm font-medium border-b-2 border-violet-500 text-[#ededed]">
              Account
            </button>
          </div>

          {/* Profile edit section — display name and avatar */}
          <ProfileEditSection
            userId={user?.id ?? ""}
            initialDisplayName={profile?.display_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />

          {/* Account info card */}
          <div className="mt-6 bg-[#111118] border border-white/[0.08] rounded-xl p-6">
            <h2 className="text-base font-semibold">Account</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-[#0a0a0f] text-sm text-muted-foreground cursor-default"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Plan</label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    plan === "pro"
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                      : "border-white/[0.12] text-[#ededed]"
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
            currentPeriodEnd={subscription?.current_period_end ?? null}
            providerSubscriptionId={subscription?.provider_subscription_id ?? null}
            invoices={invoices}
          />

          {/* Danger zone card */}
          <div className="mt-4 bg-[#111118] border border-white/[0.08] rounded-xl p-6">
            <h2 className="text-base font-semibold text-red-400">Danger zone</h2>
            <div className="mt-4">
              <DeleteAccountButton />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
