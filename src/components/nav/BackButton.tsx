"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface Props {
  href?: string;
  label?: string;
}

export function BackButton({ href, label = "Dashboard" }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className="inline-flex items-center gap-1.5 text-sm text-[#8a8580] hover:text-[#e8e4df] transition-colors mb-6 group"
    >
      <ArrowLeft
        size={15}
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {label}
    </button>
  );
}
