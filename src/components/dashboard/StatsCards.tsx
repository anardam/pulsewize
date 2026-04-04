// src/components/dashboard/StatsCards.tsx

interface StatsCardsProps {
  totalReports: number;
  platformCount: number;
  plan: "free" | "pro";
  usageCount: number;
}

export function StatsCards({
  totalReports,
  platformCount,
  plan,
  usageCount,
}: StatsCardsProps) {
  const usageLimit = plan === "pro" ? "\u221e" : "3";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total analyses */}
      <div className="bg-[#111118] border border-white/[0.08] rounded-xl p-5">
        <p className="text-xs text-muted-foreground">Total analyses</p>
        <p className="text-2xl font-semibold mt-1">{totalReports}</p>
      </div>

      {/* Platforms used */}
      <div className="bg-[#111118] border border-white/[0.08] rounded-xl p-5">
        <p className="text-xs text-muted-foreground">Platforms used</p>
        <p className="text-2xl font-semibold mt-1">{platformCount}</p>
      </div>

      {/* Account plan */}
      <div className="bg-[#111118] border border-white/[0.08] rounded-xl p-5">
        <p className="text-xs text-muted-foreground">Account plan</p>
        <div className="mt-1 flex items-center gap-2">
          {plan === "pro" ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-violet-500/30 bg-violet-500/10 text-violet-300">
              Pro
            </span>
          ) : (
            <span className="text-2xl font-semibold">Free</span>
          )}
        </div>
      </div>

      {/* This month usage */}
      <div className="bg-[#111118] border border-white/[0.08] rounded-xl p-5">
        <p className="text-xs text-muted-foreground">This month</p>
        <p className="text-2xl font-semibold mt-1">
          {usageCount} / {usageLimit}
        </p>
      </div>
    </div>
  );
}
