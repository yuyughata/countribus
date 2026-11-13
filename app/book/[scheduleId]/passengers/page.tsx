import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { CheckoutForm } from "@/components/booking/checkout-form";
import { SiteHeader } from "@/components/marketing/site-chrome";
import { BookingSteps } from "@/components/booking/booking-steps";
import { getAuthContext } from "@/lib/auth/context";
import { formatKobo } from "@/lib/money";
import { getScheduleForBooking, getSeatMap } from "@/features/booking/queries";

export const metadata = { title: "Passenger details" };

export default async function PassengersPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect(`/login?next=/book/${scheduleId}/passengers`);

  const schedule = await getScheduleForBooking(scheduleId);
  if (!schedule || schedule.status !== "published") notFound();
  const seats = await getSeatMap(scheduleId);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
        <Link href={`/book/${scheduleId}`} className="text-muted hover:text-foreground text-sm">
          ← Back to seats
        </Link>
        <BookingSteps current={2} />
        <div>
          <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight">
            Passenger details
          </h1>
          <p className="text-muted mt-1 text-sm">
            {schedule.origin?.name} → {schedule.destination?.name} · {schedule.vendors?.name} ·{" "}
            {schedule.base_fare_kobo ? `${formatKobo(schedule.base_fare_kobo)} per seat` : ""}
          </p>
        </div>
        <Card>
          <CardContent>
            <CheckoutForm
              scheduleId={scheduleId}
              seats={seats}
              fareKobo={schedule.base_fare_kobo ?? 0}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
