"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createBookingAndPay } from "@/features/booking/checkout";
import { formatKobo } from "@/lib/money";
import type { SeatCell } from "@/features/booking/queries";
import type { PaymentProvider } from "@/lib/supabase/database.types";

type Hold = { token: string; seatIds: string[]; expiresAt: string };

const field =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none";

export function CheckoutForm({
  scheduleId,
  seats,
  fareKobo,
}: {
  scheduleId: string;
  seats: SeatCell[];
  fareKobo: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [provider, setProvider] = useState<PaymentProvider>("paystack");
  const [pax, setPax] = useState<Record<string, { full_name: string; phone: string }>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`hold:${scheduleId}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read client-only storage after mount (avoids hydration mismatch)
      if (raw) setHold(JSON.parse(raw) as Hold);
    } catch {}
  }, [scheduleId]);

  const labelFor = useMemo(() => {
    const m = new Map(seats.map((s) => [s.seat_id, s.seat_label]));
    return (id: string) => m.get(id) ?? id;
  }, [seats]);

  if (!hold || hold.seatIds.length === 0) {
    return (
      <div className="text-muted space-y-3 text-sm">
        <p>Your seat hold has expired or is missing.</p>
        <Button onClick={() => router.push(`/book/${scheduleId}`)}>Select seats again</Button>
      </div>
    );
  }

  const total = hold.seatIds.length * fareKobo;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const passengers = hold!.seatIds.map((seat_id) => ({
      seat_id,
      full_name: pax[seat_id]?.full_name ?? "",
      phone: pax[seat_id]?.phone ?? "",
    }));
    start(async () => {
      const r = await createBookingAndPay({
        scheduleId,
        holdToken: hold!.token,
        provider,
        contact: { name: contact.name, phone: contact.phone, email: contact.email || undefined },
        passengers,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      try {
        sessionStorage.removeItem(`hold:${scheduleId}`);
      } catch {}
      if ("checkoutUrl" in r) {
        window.location.href = r.checkoutUrl;
      } else {
        router.push(`/bookings/${r.reference}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-foreground text-sm font-semibold">Booking contact</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={field}
            required
            placeholder="Full name"
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
          />
          <input
            className={field}
            required
            placeholder="Phone"
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
          />
          <input
            className={field}
            type="email"
            placeholder="Email (for ticket)"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-foreground text-sm font-semibold">Passengers</h3>
        {hold.seatIds.map((id) => (
          <div key={id} className="grid gap-3 sm:grid-cols-[70px_1fr_1fr] sm:items-center">
            <span className="bg-primary-soft text-primary inline-flex h-10 items-center justify-center rounded-md text-sm font-medium">
              {labelFor(id)}
            </span>
            <input
              className={field}
              required
              placeholder="Passenger name"
              value={pax[id]?.full_name ?? ""}
              onChange={(e) =>
                setPax({
                  ...pax,
                  [id]: { ...pax[id], full_name: e.target.value, phone: pax[id]?.phone ?? "" },
                })
              }
            />
            <input
              className={field}
              placeholder="Phone (optional)"
              value={pax[id]?.phone ?? ""}
              onChange={(e) =>
                setPax({
                  ...pax,
                  [id]: { full_name: pax[id]?.full_name ?? "", phone: e.target.value },
                })
              }
            />
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-muted space-y-1 text-xs font-medium">
          Pay with
          <select
            className={field}
            value={provider}
            onChange={(e) => setProvider(e.target.value as PaymentProvider)}
          >
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
          </select>
        </label>
        <div className="text-right">
          <p className="text-muted text-sm">Total</p>
          <p className="text-foreground text-xl font-semibold">{formatKobo(total)}</p>
        </div>
      </section>

      {error && <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Processing…" : `Pay ${formatKobo(total)}`}
      </Button>
    </form>
  );
}
