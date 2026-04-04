// src/app/page.tsx — Landing page for unauthenticated visitors
// Sections: Hero → Features → Pricing preview → Footer
import Link from "next/link";
import { Zap, TrendingUp, BarChart2 } from "lucide-react";
import { TopNav } from "@/components/nav/TopNav";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <TopNav />

      {/* Hero Section */}
      <section
        className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-16"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.12) 0%, transparent 60%), #0a0a0f",
        }}
      >
        <h1 className="text-4xl sm:text-5xl font-bold max-w-3xl leading-tight">
          Unlock growth insights for any{" "}
          <span className="gradient-text">Instagram</span> profile
        </h1>
        <p className="text-sm text-muted-foreground mt-4 max-w-[480px]">
          AI-powered analysis gives you actionable strategies to grow your
          audience and increase engagement — in seconds.
        </p>
        <div className="flex gap-4 mt-8 flex-wrap justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            Get started
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium border border-white/[0.12] text-[#ededed] hover:bg-white/[0.06] transition-colors"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap size={24} className="text-violet-400" />,
              title: "AI-powered insights",
              body: "Claude AI analyses engagement patterns, content quality, and growth trends to surface what's actually working.",
            },
            {
              icon: <TrendingUp size={24} className="text-violet-400" />,
              title: "Growth strategies",
              body: "Get a tailored 90-day roadmap with specific actions to grow your follower count and engagement rate.",
            },
            {
              icon: <BarChart2 size={24} className="text-violet-400" />,
              title: "Actionable recommendations",
              body: "Concrete posting schedules, hashtag strategy, and content ideas based on what performs in your niche.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-[#111118] border border-white/[0.08] rounded-xl p-6 card-glow"
            >
              {feature.icon}
              <h3 className="text-base font-semibold mt-4">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-xl font-semibold text-center mb-8">Simple pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111118] border border-white/[0.08] rounded-xl p-6">
            <h3 className="text-base font-semibold">Free</h3>
            <p className="text-sm text-muted-foreground mt-1">3 analyses per month</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>3 analyses/month</li>
              <li>Basic insights</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.12] text-[#ededed] hover:bg-white/[0.06] transition-colors"
            >
              Get started
            </Link>
          </div>

          <div className="bg-[#111118] border border-violet-500/30 rounded-xl p-6 relative">
            <span className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full border border-violet-500/50 text-violet-400">
              Most popular
            </span>
            <h3 className="text-base font-semibold">Pro</h3>
            <p className="text-sm text-muted-foreground mt-1">Unlimited analyses</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Unlimited analyses</li>
              <li>Full report history</li>
              <li>Priority processing</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Get started — Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold gradient-text">SocialLens</span>
          <span className="text-xs text-muted-foreground">Built with Claude AI</span>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SocialLens
          </span>
        </div>
      </footer>
    </div>
  );
}
