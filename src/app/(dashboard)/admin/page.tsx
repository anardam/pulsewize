import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/admin";
import { AdminSubscriptionControls } from "@/components/admin/AdminSubscriptionControls";
import { AdminCouponForm } from "@/components/admin/AdminCouponForm";
import { getStripe } from "@/lib/stripe/server";

export const metadata: Metadata = { title: "Admin — Pulsewize" };

interface SearchParams {
  q?: string;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface SubscriptionRow {
  user_id: string;
  plan: "free" | "pro";
  status: string;
  provider: "stripe" | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
}

interface UsageRow {
  user_id: string;
  analyses_used: number;
}

interface UserIdRow {
  user_id: string;
}

interface ConnectedAccountRow extends UserIdRow {
  platform: string;
}

interface PromotionCodeRow {
  id: string;
  code: string | null;
  active: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  coupon: {
    id: string;
    percent_off: number | null;
    duration: string;
    duration_in_months: number | null;
  };
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = resolvedSearchParams.q?.trim() ?? "";
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  let serviceSupabase: ReturnType<typeof createSupabaseService> | null = null;
  let configError: string | null = null;

  try {
    serviceSupabase = createSupabaseService();
  } catch (error) {
    configError =
      error instanceof Error
        ? error.message
        : "Admin service configuration is missing";
  }

  if (!serviceSupabase) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-rose-400">Ops Panel</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#f3eee8]">
            Admin workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#8f877f]">
            The admin panel is available for your account, but it needs the Supabase
            service role key before it can load support data safely.
          </p>
        </div>

        <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6">
          <p className="text-sm font-medium text-amber-200">Missing admin configuration</p>
          <p className="mt-2 text-sm text-amber-100/80">
            {configError}
          </p>
          <p className="mt-4 text-sm text-[#d7d0c8]">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to your local env and restart the dev
            server. The same key will also be required in Vercel for production admin tools.
          </p>
        </div>
      </div>
    );
  }

  const billingMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  let profilesQuery = serviceSupabase
    .from("profiles")
    .select("id, email, display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (query) {
    profilesQuery = profilesQuery.or(
      `email.ilike.%${query}%,display_name.ilike.%${query}%`
    );
  }

  const [
    { data: profiles },
    { count: totalUsers },
    { count: totalReports },
    { count: totalConnectedAccounts },
    { count: totalProUsers },
  ] = await Promise.all([
    profilesQuery,
    serviceSupabase.from("profiles").select("*", { count: "exact", head: true }),
    serviceSupabase.from("reports").select("*", { count: "exact", head: true }),
    serviceSupabase
      .from("connected_accounts")
      .select("*", { count: "exact", head: true }),
    serviceSupabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("plan", "pro"),
  ]);

  const users = (profiles ?? []) as ProfileRow[];
  const userIds = users.map((profile) => profile.id);

  const [subscriptionsResult, usageResult, reportsResult, connectedResult] =
    userIds.length > 0
      ? await Promise.all([
          serviceSupabase
            .from("subscriptions")
            .select(
              "user_id, plan, status, provider, provider_subscription_id, current_period_end"
            )
            .in("user_id", userIds),
          serviceSupabase
            .from("usage")
            .select("user_id, analyses_used")
            .eq("billing_month", billingMonth)
            .in("user_id", userIds),
          serviceSupabase.from("reports").select("user_id").in("user_id", userIds),
          serviceSupabase
            .from("connected_accounts")
            .select("user_id, platform")
            .in("user_id", userIds),
        ])
      : [
          { data: [] as SubscriptionRow[] | null },
          { data: [] as UsageRow[] | null },
          { data: [] as UserIdRow[] | null },
          { data: [] as ConnectedAccountRow[] | null },
        ];

  let promotionCodes: PromotionCodeRow[] = [];
  try {
    const stripe = getStripe();
    const codes = await stripe.promotionCodes.list({
      active: true,
      limit: 12,
      expand: ["data.promotion.coupon"],
    });

    promotionCodes = codes.data.map((code) => ({
      id: code.id,
      code: code.code,
      active: code.active,
      max_redemptions: code.max_redemptions,
      times_redeemed: code.times_redeemed,
      coupon: {
        id:
          typeof code.promotion.coupon === "string"
            ? code.promotion.coupon
            : code.promotion.coupon?.id ?? "unknown",
        percent_off:
          typeof code.promotion.coupon === "string"
            ? null
            : code.promotion.coupon?.percent_off ?? null,
        duration:
          typeof code.promotion.coupon === "string"
            ? "unknown"
            : code.promotion.coupon?.duration ?? "unknown",
        duration_in_months:
          typeof code.promotion.coupon === "string"
            ? null
            : code.promotion.coupon?.duration_in_months ?? null,
      },
    }));
  } catch {
    promotionCodes = [];
  }

  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const usageRows = (usageResult.data ?? []) as UsageRow[];
  const reportRows = (reportsResult.data ?? []) as UserIdRow[];
  const connectedRows = (connectedResult.data ?? []) as ConnectedAccountRow[];

  const subscriptionByUser = new Map(
    subscriptions.map((subscription) => [subscription.user_id, subscription])
  );
  const usageByUser = new Map(
    usageRows.map((row) => [row.user_id, row.analyses_used])
  );

  const reportsByUser = new Map<string, number>();
  reportRows.forEach((row) => {
    reportsByUser.set(row.user_id, (reportsByUser.get(row.user_id) ?? 0) + 1);
  });

  const connectedByUser = new Map<string, string[]>();
  connectedRows.forEach((row) => {
    const current = connectedByUser.get(row.user_id) ?? [];
    current.push(row.platform);
    connectedByUser.set(row.user_id, current);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-rose-400">Ops Panel</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#f3eee8]">
            Admin workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#8f877f]">
            Support users, inspect plans and usage, and manually adjust access while
            we build the fuller coupon flow.
          </p>
        </div>

        <form className="flex w-full max-w-md items-center gap-3 lg:justify-end">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search email or display name"
            className="w-full rounded-2xl border border-white/[0.08] bg-[#121212] px-4 py-3 text-sm text-[#f3eee8] outline-none transition-colors placeholder:text-[#746c65] focus:border-rose-400/40"
          />
          <button
            type="submit"
            className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#111111] transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total users", value: totalUsers ?? 0 },
          { label: "Pro users", value: totalProUsers ?? 0 },
          { label: "Saved reports", value: totalReports ?? 0 },
          { label: "Connected accounts", value: totalConnectedAccounts ?? 0 },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[28px] border border-white/[0.06] bg-[#111111] p-5"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b736c]">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#f3eee8]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-[30px] border border-white/[0.06] bg-[#101010] p-5 sm:p-6">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="text-lg font-semibold text-[#f3eee8]">Active promotion codes</h2>
            <p className="mt-1 text-sm text-[#8f877f]">
              These Stripe codes can be used directly in Checkout. Use 100% off for waived access
              without forcing a manual plan change.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {promotionCodes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-10 text-center text-sm text-[#8f877f]">
                No active promotion codes yet.
              </div>
            ) : (
              promotionCodes.map((promotionCode) => (
                <div
                  key={promotionCode.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/[0.06] bg-[#141414] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold tracking-tight text-[#f3eee8]">
                        {promotionCode.code ?? "AUTO"}
                      </p>
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-300">
                        {promotionCode.coupon.percent_off ?? 0}% off
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#8f877f]">
                      {promotionCode.coupon.duration === "repeating"
                        ? `${promotionCode.coupon.duration_in_months ?? 0} month repeating`
                        : promotionCode.coupon.duration}
                    </p>
                  </div>

                  <div className="text-sm text-[#cfc8c1] sm:text-right">
                    <p>
                      Redeemed {promotionCode.times_redeemed}
                      {promotionCode.max_redemptions
                        ? ` / ${promotionCode.max_redemptions}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-[#756d66]">
                      Coupon {promotionCode.coupon.id}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <AdminCouponForm />
      </div>

      <div className="rounded-[30px] border border-white/[0.06] bg-[#101010] p-5 sm:p-6">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="text-lg font-semibold text-[#f3eee8]">Users</h2>
          <p className="mt-1 text-sm text-[#8f877f]">
            Latest {users.length} users{query ? ` matching “${query}”` : ""}.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-10 text-center text-sm text-[#8f877f]">
              No users matched this search.
            </div>
          ) : (
            users.map((profile) => {
              const subscription = subscriptionByUser.get(profile.id);
              const plan = (subscription?.plan ?? "free") as "free" | "pro";
              const connectedPlatforms = [
                ...new Set(connectedByUser.get(profile.id) ?? []),
              ];

              return (
                <div
                  key={profile.id}
                  className="grid gap-5 rounded-[24px] border border-white/[0.06] bg-[#141414] p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-[#f3eee8]">
                        {profile.display_name || profile.email.split("@")[0]}
                      </h3>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                          plan === "pro"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-white/[0.08] bg-white/[0.03] text-[#8f877f]"
                        }`}
                      >
                        {plan}
                      </span>
                      <span className="text-xs text-[#6f6963]">
                        {subscription?.status ?? "active"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#cfc8c1]">{profile.email}</p>
                    <p className="mt-1 text-xs text-[#756d66]">
                      Joined {formatDate(profile.created_at)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                        Usage
                      </p>
                      <p className="mt-2 text-sm text-[#f3eee8]">
                        {usageByUser.get(profile.id) ?? 0} this month
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                        Reports
                      </p>
                      <p className="mt-2 text-sm text-[#f3eee8]">
                        {reportsByUser.get(profile.id) ?? 0} saved
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                        Billing
                      </p>
                      <p className="mt-2 text-sm text-[#f3eee8]">
                        {subscription?.provider ?? "manual / none"}
                      </p>
                      <p className="mt-1 text-xs text-[#7b736c]">
                        Period end {formatDate(subscription?.current_period_end)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                        Connected
                      </p>
                      <p className="mt-2 text-sm text-[#f3eee8]">
                        {connectedPlatforms.length} platform
                        {connectedPlatforms.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-[#7b736c]">
                        {connectedPlatforms.length
                          ? connectedPlatforms.join(", ")
                          : "No connected accounts"}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-[180px] flex-col justify-between gap-4">
                    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6963]">
                        Support action
                      </p>
                      <p className="mt-2 text-sm text-[#cfc8c1]">
                        Manually grant or remove Pro access while coupon support is still
                        being built.
                      </p>
                    </div>

                    <AdminSubscriptionControls
                      userId={profile.id}
                      email={profile.email}
                      plan={plan}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
