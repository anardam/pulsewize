import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import {
  Sparkles,
  TrendingUp,
  BarChart3,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Facebook,
  ArrowRight,
  Check,
} from "lucide-react";

const PLATFORMS = [
  { icon: Instagram, label: "Instagram" },
  { icon: Youtube, label: "YouTube" },
  { icon: Twitter, label: "Twitter/X" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Facebook, label: "Facebook" },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Three AI engines, one report",
    body: "Claude, GPT, and Gemini independently analyze your profile, then debate and synthesize into a single strategy no single AI could produce alone.",
  },
  {
    icon: TrendingUp,
    title: "Track growth over time",
    body: "Save reports, compare metrics across months, and visualize trends in engagement, reach, and content performance.",
  },
  {
    icon: BarChart3,
    title: "Competitor intelligence",
    body: "Side-by-side comparison of up to 3 profiles. See exactly where you lead and where you can close the gap.",
  },
];

const FREE_FEATURES = [
  "3 analyses per month",
  "All 6 platforms",
  "AI growth strategy",
  "Report export",
];

const PRO_FEATURES = [
  "Unlimited analyses",
  "Multi-agent AI debate",
  "Competitor comparison",
  "30-day content calendar",
  "Hashtag strategy",
  "Growth tracking & trends",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <TopNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(347 77% 64% / 0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Platform pill */}
          <div
            className="animate-fade-up inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/[0.06] bg-white/[0.03] mb-8"
          >
            <div className="flex -space-x-1">
              {PLATFORMS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="h-5 w-5 rounded-full bg-[#1a1a1a] border border-white/[0.08] flex items-center justify-center"
                >
                  <Icon size={10} className="text-[#8a8580]" />
                </div>
              ))}
            </div>
            <span className="text-xs text-[#8a8580] font-medium">
              6 platforms supported
            </span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight"
            style={{ animationDelay: "0.1s" }}
          >
            Know what&apos;s working.
            <br />
            <span className="gradient-text">Grow what matters.</span>
          </h1>

          {/* Subheadline */}
          <p
            className="animate-fade-up mt-5 text-base sm:text-lg text-[#8a8580] max-w-xl mx-auto leading-relaxed"
            style={{ animationDelay: "0.2s" }}
          >
            Three AI engines analyze your social presence independently, then
            synthesize a strategy no single AI could produce.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up flex items-center justify-center gap-4 mt-10"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-300 hover:shadow-xl hover:shadow-rose-600/20"
            >
              Start free
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium text-[#8a8580] hover:text-[#e8e4df] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all duration-300"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="divider-rose" />

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-rose-400/80 mb-3">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Analysis that actually moves the needle
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="animate-fade-up group bg-[#141414] border border-white/[0.06] rounded-xl p-7 card-glow"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center mb-5">
                <feature.icon size={18} className="text-rose-400" />
              </div>
              <h3 className="text-[15px] font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[#8a8580] leading-relaxed">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="divider-rose" />

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-rose-400/80 mb-3">
            Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Start free. Upgrade when you&apos;re ready.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Free tier */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-7">
            <h3 className="text-base font-semibold">Free</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-sm text-[#8a8580]">/month</span>
            </div>
            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-[#8a8580]">
                  <Check size={14} className="text-[#8a8580] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium border border-white/[0.1] text-[#e8e4df] hover:bg-white/[0.04] transition-all duration-200"
            >
              Get started
            </Link>
          </div>

          {/* Pro tier */}
          <div className="relative bg-[#141414] border border-rose-500/20 rounded-xl p-7">
            <div className="absolute -top-3 left-7">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-600 text-white">
                Most popular
              </span>
            </div>
            <h3 className="text-base font-semibold">Pro</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$19.99</span>
              <span className="text-sm text-[#8a8580]">/month</span>
            </div>
            <ul className="mt-6 space-y-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-[#e8e4df]">
                  <Check size={14} className="text-rose-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/20"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">SL</span>
            </div>
            <span className="text-sm font-semibold text-[#e8e4df]">SocialLens</span>
          </div>
          <span className="text-xs text-[#8a8580]">
            © {new Date().getFullYear()} SocialLens. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
