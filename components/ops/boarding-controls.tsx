"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { recordBoarding } from "@/features/ops/actions";

export function BoardingControls({
  scheduleId,
  bookingPassengerId,
  status,
}: {
  scheduleId: string;
  bookingPassengerId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(event: "checked_in" | "boarded") {
    setError(null);
    start(async () => {
      const r = await recordBoarding(scheduleId, bookingPassengerId, event);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "not_checked_in" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => act("checked_in")}>
          Check in
        </Button>
      )}
      {status === "checked_in" && (
        <Button size="sm" disabled={pending} onClick={() => act("boarded")}>
          Board
        </Button>
      )}
      {status === "boarded" && <span className="text-success text-xs font-medium">Boarded</span>}
      {error && <span className="text-danger text-xs">{error}</span>}
    </div>
  );
}
