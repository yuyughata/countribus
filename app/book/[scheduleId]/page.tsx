import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SeatMap } from "@/components/booking/seat-map";
import { SiteHeader } from "@/components/marketing/site-chrome";
import { BookingSteps } from "@/components/booking/booking-steps";
import { formatKobo } from "@/lib/money";
import { getScheduleForBooking, getSeatMap } from "@/features/booking/queries";

export const metadata = { title: "Select seats" };

export default async function BookingPage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params;
  const schedule = await getScheduleForBooking(scheduleId);
  if (!schedule || schedule.status !== "published") notFound();
  const seats = await getSeatMap(scheduleId);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <Link
          href="/search"
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Back to search
        </Link>

        <BookingSteps current={1} />

        <div>
          <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight">
            {schedule.origin?.name} → {schedule.destination?.name}
          </h1>
          <p className="text-muted mt-1 text-sm">
            {schedule.vendors?.name} · {new Date(schedule.departure_at).toLocaleString("en-NG")} ·{" "}
            {schedule.base_fare_kobo ? `${formatKobo(schedule.base_fare_kobo)} per seat` : ""}
          </p>
        </div>

        <Card>
        <CardContent>
          <SeatMap scheduleId={scheduleId} seats={seats} fareKobo={schedule.base_fare_kobo ?? 0} />
        </CardContent>
        </Card>
      </main>
    </>
  );
}
