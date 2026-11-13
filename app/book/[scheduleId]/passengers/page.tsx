import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getScheduleForBooking } from "@/features/booking/queries";

export const metadata = { title: "Passenger details" };

// Phase 4 placeholder — the full passenger + luggage + payment flow lands in Phase 5.
export default async function PassengersPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const schedule = await getScheduleForBooking(scheduleId);

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-10 sm:px-6">
      <h1 className="text-foreground text-xl font-semibold">Seats held</h1>
      <Card>
        <CardContent className="text-muted space-y-2 text-sm">
          <p>
            Your seats for{" "}
            <span className="text-foreground font-medium">
              {schedule?.origin?.name} → {schedule?.destination?.name}
            </span>{" "}
            are held for 10 minutes.
          </p>
          <p>Passenger details, luggage declaration and payment are the next step (Phase 5).</p>
          <Link href={`/book/${scheduleId}`} className="text-primary inline-block font-medium">
            ← Back to seat selection
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
