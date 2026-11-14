import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export const metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-3">
            <span className="rule-gold" />
            <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
              The essentials
            </span>
          </span>
          <h1 className="font-display text-foreground mt-2 text-3xl font-semibold tracking-tight">
            Terms &amp; Conditions
          </h1>
        </div>

        <div className="text-muted space-y-5 text-sm leading-relaxed">
          <p>
            Countribus is a marketplace that connects travellers with verified intercity bus
            operators. When you book, you enter into a transport contract with the operator;
            Countribus provides the booking, payment and ticketing service.
          </p>
          <section>
            <h2 className="text-foreground text-base font-semibold">Bookings &amp; payment</h2>
            <p className="mt-1">
              Fares are shown per seat and confirmed at checkout. A booking is only confirmed once
              payment is verified. You&apos;ll receive a digital ticket by email; present it (with
              ID) at the terminal.
            </p>
          </section>
          <section>
            <h2 className="text-foreground text-base font-semibold">Boarding</h2>
            <p className="mt-1">
              Boarding, luggage, punctuality, conduct, and changes are governed by our{" "}
              <Link href="/boarding-policy" className="text-primary font-medium">
                Boarding Policy
              </Link>
              , which you accept when completing a booking.
            </p>
          </section>
          <section>
            <h2 className="text-foreground text-base font-semibold">Cancellations &amp; refunds</h2>
            <p className="mt-1">
              Cancellations and refunds follow the operator&apos;s policy and the platform terms.
              Where a refund is due, it is returned to your original payment method.
            </p>
          </section>
          <section>
            <h2 className="text-foreground text-base font-semibold">Conduct &amp; liability</h2>
            <p className="mt-1">
              Please travel respectfully and follow crew instructions. Operators are responsible for
              the transport service; Countribus is responsible for the booking platform.
            </p>
          </section>
          <p className="text-subtle text-xs">
            For questions, contact Countribus support. These terms may be updated from time to time.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
