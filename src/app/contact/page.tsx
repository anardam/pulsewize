import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact and support information for Pulsewize.",
};

export default function ContactPage() {
  return (
    <LegalPageShell
      eyebrow="Contact"
      title="Contact and Support"
      description="If you need help with billing, account access, or product issues, use the contact details below."
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Support email</h2>
        <p className="mt-2">
          Email{" "}
          <a
            href="mailto:mahesh.sangawar@gmail.com"
            className="text-rose-300 hover:text-rose-200"
          >
            mahesh.sangawar@gmail.com
          </a>
          {" "}for product support, billing questions, refunds, or account issues.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">What to include</h2>
        <p className="mt-2">
          To help us resolve issues faster, include your account email, the platform or
          feature involved, and a short description of what happened. For billing questions,
          include the approximate charge date.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f3eee8]">Response times</h2>
        <p className="mt-2">
          We aim to respond to support requests within a reasonable business timeframe. More
          complex billing or connected-account issues may take longer when coordination with
          external providers is required.
        </p>
      </section>
    </LegalPageShell>
  );
}
