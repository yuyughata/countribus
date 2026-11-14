"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClass as field } from "@/components/ui/field";
import { createBookingAndPay } from "@/features/booking/checkout";
import { formatKobo } from "@/lib/money";
import {
  SEATED_TYPE_OPTIONS,
  fareForSeatedType,
  type SeatedType,
} from "@/lib/booking/passenger-types";
import type { SeatCell } from "@/features/booking/queries";
import type { PaymentProvider } from "@/lib/supabase/database.types";

type Hold = {
  token: string;
  seatIds: string[];
  surcharges?: Record<string, number>;
  fareKobo?: number;
  expiresAt: string;
};

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
  const [pax, setPax] = useState<
    Record<string, { full_name: string; phone: string; type: SeatedType }>
  >({});
  const [bags, setBags] = useState<Record<string, number>>({});
  const [infants, setInfants] = useState<{ full_name: string }[]>([]);

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

  const seatBase = (id: string) => fareKobo + (hold.surcharges?.[id] ?? 0);
  const typeOf = (id: string): SeatedType => pax[id]?.type ?? "adult";
  const total = hold.seatIds.reduce((s, id) => s + fareForSeatedType(typeOf(id), seatBase(id)), 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const passengers = hold!.seatIds.map((seat_id) => ({
      seat_id,
      full_name: pax[seat_id]?.full_name ?? "",
      phone: pax[seat_id]?.phone ?? "",
      type: typeOf(seat_id),
    }));
    const cleanInfants = infants.filter((i) => i.full_name.trim());
    if (cleanInfants.some((i) => !i.full_name.trim())) return;
    const luggage = hold!.seatIds
      .map((seat_id) => ({ seat_id, type: "medium_bag", quantity: bags[seat_id] ?? 0 }))
      .filter((l) => l.quantity > 0);
    start(async () => {
      const r = await createBookingAndPay({
        scheduleId,
        holdToken: hold!.token,
        provider,
        contact: { name: contact.name, phone: contact.phone, email: contact.email || undefined },
        passengers,
        infants: cleanInfants,
        luggage,
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
        <h3 className="text-foreground text-sm font-semibold">Passengers (one per seat)</h3>
        {hold.seatIds.map((id) => {
          const t = typeOf(id);
          return (
            <div
              key={id}
              className="grid gap-3 sm:grid-cols-[56px_1fr_150px_1fr_76px] sm:items-center"
            >
              <span className="bg-brand-ink inline-flex h-10 items-center justify-center rounded-md text-sm font-semibold text-white">
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
                    [id]: {
                      full_name: e.target.value,
                      phone: pax[id]?.phone ?? "",
                      type: t,
                    },
                  })
                }
              />
              <select
                className={field}
                value={t}
                aria-label="Passenger type"
                onChange={(e) =>
                  setPax({
                    ...pax,
                    [id]: {
                      full_name: pax[id]?.full_name ?? "",
                      phone: pax[id]?.phone ?? "",
                      type: e.target.value as SeatedType,
                    },
                  })
                }
              >
                {SEATED_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                className={field}
                placeholder="Phone (optional)"
                value={pax[id]?.phone ?? ""}
                onChange={(e) =>
                  setPax({
                    ...pax,
                    [id]: {
                      full_name: pax[id]?.full_name ?? "",
                      phone: e.target.value,
                      type: t,
                    },
                  })
                }
              />
              <span className="text-foreground text-right text-sm font-medium sm:text-center">
                {formatKobo(fareForSeatedType(t, seatBase(id)))}
              </span>
            </div>
          );
        })}
        <div className="grid gap-3 sm:grid-cols-[56px_1fr_150px_1fr_76px] sm:items-center">
          <span className="text-subtle text-xs sm:col-span-2">Checked bags per seat →</span>
        </div>
        {hold.seatIds.map((id) => (
          <div key={`bag-${id}`} className="flex items-center gap-3 text-sm">
            <span className="text-muted w-14">{labelFor(id)}</span>
            <input
              className={`${field} max-w-[90px]`}
              type="number"
              min={0}
              max={10}
              title="Checked bags"
              placeholder="Bags"
              value={bags[id] ?? 0}
              onChange={(e) => setBags({ ...bags, [id]: Math.max(0, Number(e.target.value) || 0) })}
            />
            <span className="text-subtle text-xs">checked bag(s)</span>
          </div>
        ))}
        <p className="text-subtle text-xs">
          First bag per passenger is free; extra bags are charged per the operator&apos;s policy.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">
            Lap infants{" "}
            <span className="text-subtle font-normal">— ages 1–5, travel free (no seat)</span>
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInfants([...infants, { full_name: "" }])}
          >
            <Plus className="size-4" /> Add infant
          </Button>
        </div>
        {infants.length === 0 ? (
          <p className="text-subtle text-xs">No lap infants on this booking.</p>
        ) : (
          infants.map((inf, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="bg-accent-soft text-accent-strong inline-flex h-10 items-center rounded-md px-2 text-xs font-medium">
                1–5
              </span>
              <input
                className={field}
                required
                placeholder="Infant name"
                value={inf.full_name}
                onChange={(e) =>
                  setInfants(infants.map((x, j) => (j === i ? { full_name: e.target.value } : x)))
                }
              />
              <span className="text-success text-sm font-medium">Free</span>
              <button
                type="button"
                aria-label="Remove infant"
                className="text-subtle hover:text-danger"
                onClick={() => setInfants(infants.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </button>
            </div>
          ))
        )}
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
          <p className="text-foreground font-display text-2xl font-semibold">{formatKobo(total)}</p>
        </div>
      </section>

      {error && <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending
          ? "Processing…"
          : `Pay securely with ${provider === "paystack" ? "Paystack" : "Flutterwave"} · ${formatKobo(total)}`}
      </Button>
    </form>
  );
}
