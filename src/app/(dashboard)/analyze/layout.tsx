// Server component layout wrapper — provides TopNav for the client analyze page
// without importing server-only modules in a client component boundary.
import { TopNav } from "@/components/nav/TopNav";

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav activePath="/analyze" />
      {children}
    </>
  );
}
