import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function LegalPageShell({ eyebrow, title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="rounded-[32px] border border-white/[0.06] bg-[#121212] p-7 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-400/80">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#f3eee8] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#8f877f] sm:text-base">
            {description}
          </p>

          <div className="mt-10 space-y-8 text-sm leading-7 text-[#d2cbc4] sm:text-[15px]">
            {children}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-[#8f877f]">
          <Link href="/privacy" className="hover:text-[#f3eee8] transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#f3eee8] transition-colors">
            Terms
          </Link>
          <Link href="/refunds" className="hover:text-[#f3eee8] transition-colors">
            Refunds
          </Link>
          <Link href="/contact" className="hover:text-[#f3eee8] transition-colors">
            Contact
          </Link>
        </div>
      </main>
    </div>
  );
}
