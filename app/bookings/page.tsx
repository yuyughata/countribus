import Link from "next/link";
import { redirect } from "next/navigation";

import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/marketing/site-chrome";
import { getAuthContext } from "@/lib/auth/context";
import { formatKobo } from "@/lib/money";
import { BOOKING_STATUS_TONE, bookingStatusLabel } from "@/lib/booking/status";
import { listMyBookings } from "@/features/booking/account";

export const metadata = { title: "My bookings" };

export default async function MyBookingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/bookings");
  const bookings = await listMyBookings(ctx.userId);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-3">
              <span className="rule-gold" />
              <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
                Your trips
              </span>
            </span>
            <h1 className="font-display text-foreground mt-2 text-3xl font-semibold tracking-tight">
              My bookings
            </h1>
          </div>
          <Link href="/search" className="shrink-0">
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" /> New booking
            </Button>
          </Link>
        </div>

        {bookings.length === 0 ? (
          <Card className="text-muted p-8 text-center text-sm">
            No bookings yet.{" "}
            <Link href="/search" className="text-primary font-medium">
              Find a journey
            </Link>
            .
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Link key={b.id} href={`/bookings/${b.reference}`}>
                <Card className="hover:bg-surface-muted flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold">{b.reference}</p>
                      <Badge tone={BOOKING_STATUS_TONE[b.status] ?? "neutral"}>
                        {bookingStatusLabel(b.status)}
                      </Badge>
                    </div>
                    <p className="text-muted text-xs">
                      {b.passenger_count} passenger{b.passenger_count === 1 ? "" : "s"} ·{" "}
                      {b.schedules
                        ? new Date(b.schedules.departure_at).toLocaleString("en-NG")
                        : ""}
                    </p>
                  </div>
                  <p className="text-foreground text-sm font-semibold">
                    {formatKobo(b.grand_total_kobo)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
