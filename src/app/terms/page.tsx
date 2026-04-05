import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the Pulsewize platform.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms"
      title="Terms of Service"
      description="These terms govern your use of Pulsewize and the subscription features made available through the platform."
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Use of the service</h2>
        <p className="mt-2">
          Pulsewize provides software tools for social media analysis, connected-account
          syncing, and AI-generated strategic recommendations. You agree to use the service
          only for lawful business or creator workflows and not to misuse, reverse engineer,
          or interfere with the platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Accounts</h2>
        <p className="mt-2">
          You are responsible for keeping your login credentials secure and for all activity
          that occurs under your account. You must ensure that any connected social accounts
          belong to you or that you are authorized to connect and analyze them.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Subscriptions</h2>
        <p className="mt-2">
          Paid plans are billed on a recurring basis through Stripe unless otherwise stated.
          Subscription access continues until cancelled. If you cancel, premium features
          remain available until the end of the current billing period, after which the
          account returns to the free tier.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">AI outputs</h2>
        <p className="mt-2">
          Pulsewize generates strategy recommendations using AI models and third-party data
          sources. These outputs are intended as informational guidance and may contain
          errors, estimates, or judgments. You remain responsible for business, marketing,
          and publishing decisions made using the platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Availability</h2>
        <p className="mt-2">
          We aim to keep the product available and reliable, but we do not guarantee
          uninterrupted service. Features may change, improve, or be removed as the product
          evolves.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Contact</h2>
        <p className="mt-2">
          Questions about these terms can be sent to{" "}
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
