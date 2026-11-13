"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cancelMyBooking } from "@/features/booking/actions";

export function CancelBookingButton({
  bookingId,
  reference,
}: {
  bookingId: string;
  reference: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Cancel booking
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted text-xs">Are you sure?</span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await cancelMyBooking(bookingId, reference);
            if (!r.ok) setError(r.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Cancelling…" : "Yes, cancel"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        No
      </Button>
      {error && <span className="text-danger text-xs">{error}</span>}
    </div>
  );
}
