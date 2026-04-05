import { TopNav } from "@/components/nav/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </>
  );
}
