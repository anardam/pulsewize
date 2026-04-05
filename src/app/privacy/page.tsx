import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Pulsewize collects, uses, and protects customer data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This page explains what information Pulsewize collects, how we use it, and the steps we take to protect it."
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">What we collect</h2>
        <p className="mt-2">
          We collect account information you provide during signup, such as your email
          address and display name. When you connect supported social platforms, we
          may store platform account identifiers, profile metadata, and OAuth tokens
          needed to refresh account data on your behalf.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">How we use data</h2>
        <p className="mt-2">
          We use your data to authenticate your account, generate reports, save analysis
          history, improve the product experience, process subscriptions, and provide
          support. Connected account data is used only to power the features you request,
          such as analytics refreshes and AI-generated growth recommendations.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Payments</h2>
        <p className="mt-2">
          Subscription payments are processed by Stripe. Pulsewize does not store full
          card details on its own servers. Payment-related records we retain are limited
          to subscription status, provider identifiers, invoice references, and billing
          timestamps needed to manage access and support.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Storage and security</h2>
        <p className="mt-2">
          We use Supabase for data storage and authentication. Sensitive connected-account
          credentials are stored server-side and encrypted before persistence where
          supported by the current system configuration. Access to administrative tools is
          restricted to authorized operators only.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Your choices</h2>
        <p className="mt-2">
          You can update your profile details, disconnect supported accounts, and cancel
          your subscription from within the product. If you want your account or stored
          data deleted, contact support and we will process the request in a reasonable
          timeframe, subject to legal and billing record retention requirements.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Contact</h2>
        <p className="mt-2">
          Privacy questions can be sent to{" "}
          <a
            href="mailto:mahesh.sangawar@gmail.com"
            className="text-rose-300 hover:text-rose-200"
          >
            mahesh.sangawar@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
