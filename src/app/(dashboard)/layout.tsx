import { TopNav } from "@/components/nav/TopNav";
import { QuickActions } from "@/components/nav/QuickActions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <QuickActions />
        {children}
      </div>
      {/* Spacer for mobile bottom nav */}
      <div className="sm:hidden h-20" />
    </>
  );
}
