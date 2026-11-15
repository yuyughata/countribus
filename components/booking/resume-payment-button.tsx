"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resumeBookingPayment } from "@/features/booking/resume-payment";
import { formatKobo } from "@/lib/money";

export function ResumePaymentButton({
  reference,
  amountKobo,
}: {
  reference: string;
  amountKobo: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function pay() {
    setNote(null);
    start(async () => {
      const r = await resumeBookingPayment(reference);
      if (!r.ok) {
        setNote(r.error);
        router.refresh();
        return;
      }
      if ("checkoutUrl" in r) {
        window.location.href = r.checkoutUrl;
        return;
      }
      setNote(r.note);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={pay} disabled={pending} size="lg" className="w-full gap-2">
        <CreditCard className="size-4" />
        {pending ? "Starting payment…" : `Complete payment · ${formatKobo(amountKobo)}`}
      </Button>
      {note && <p className="text-muted text-sm">{note}</p>}
    </div>
  );
}
