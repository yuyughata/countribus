import { redirect } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { TicketWorkspace } from "@/components/support/ticket-workspace";
import { getAuthContext } from "@/lib/auth/context";
import { listMyTickets } from "@/features/support/queries";
import { listMyBookings } from "@/features/booking/account";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/support");
  const [tickets, bookings] = await Promise.all([listMyTickets(), listMyBookings(ctx.userId)]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-3">
            <span className="rule-gold" />
            <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
              Help
            </span>
          </span>
          <h1 className="font-display text-foreground mt-2 text-3xl font-semibold tracking-tight">
            Support
          </h1>
          <p className="text-muted mt-1 text-sm">
            Send feedback, raise a complaint, or get help with a booking.
          </p>
        </div>
        <TicketWorkspace
          mode="customer"
          tickets={tickets}
          bookings={bookings.map((b) => ({ id: b.id, reference: b.reference }))}
        />
      </main>
      <SiteFooter />
    </>
  );
}
