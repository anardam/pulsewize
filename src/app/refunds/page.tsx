import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund and cancellation policy for Pulsewize subscriptions.",
};

export default function RefundsPage() {
  return (
    <LegalPageShell
      eyebrow="Refunds"
      title="Refund Policy"
      description="This page explains how cancellations and refund requests are handled for Pulsewize subscriptions."
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Subscription cancellations</h2>
        <p className="mt-2">
          You can cancel your subscription at any time from the Settings page. Cancellation
          stops renewal at the end of the current billing period, and your plan will return
          to the free tier after that period ends.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Refunds</h2>
        <p className="mt-2">
          Because Pulsewize is a digital subscription service with immediate access to
          software features, payments are generally non-refundable once a billing period has
          started. If you believe you were charged in error or experienced a billing issue,
          contact us and we will review the case individually.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Exceptional cases</h2>
        <p className="mt-2">
          We may offer refunds or account credits at our discretion for duplicate charges,
          clear service failures, or other exceptional circumstances. Any approved refund is
          issued back to the original payment method where possible.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Support</h2>
        <p className="mt-2">
          For billing support, email{" "}
          <a
            href="mailto:mahesh.sangawar@gmail.com"
            className="text-rose-300 hover:text-rose-200"
          >
            mahesh.sangawar@gmail.com
          </a>
          {" "}with your account email and a short description of the issue.
        </p>
      </section>
    </LegalPageShell>
  );
}
