"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClass as field } from "@/components/ui/field";
import { createBookingAndPay } from "@/features/booking/checkout";
import { previewPromoCode } from "@/features/promotions/actions";
import { formatKobo } from "@/lib/money";
import { fareForSeatedType, type SeatedType } from "@/lib/booking/passenger-types";
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
  availableRewardPercent = null,
}: {
  scheduleId: string;
  seats: SeatCell[];
  fareKobo: number;
  availableRewardPercent?: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  // Paystack is the only payment provider for now.
  const provider: PaymentProvider = "paystack";
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountKobo: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [useReward, setUseReward] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [seated, setSeated] = useState<{ full_name: string; phone: string; type: SeatedType }[]>(
    [],
  );
  const [bagCount, setBagCount] = useState(0);
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

  const seatIds = hold.seatIds;
  const maxSeats = seatIds.length;
  const seatBase = (id: string) => fareKobo + (hold.surcharges?.[id] ?? 0);
  const total = seated.reduce((s, p, i) => s + fareForSeatedType(p.type, seatBase(seatIds[i])), 0);
  const allSeatsAssigned = seated.length === maxSeats && seated.every((p) => p.full_name.trim());

  function addSeated(type: SeatedType) {
    if (seated.length >= maxSeats) return;
    setSeated([...seated, { full_name: "", phone: "", type }]);
  }
  function updateSeated(i: number, patch: Partial<(typeof seated)[number]>) {
    setSeated(seated.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function removeSeated(i: number) {
    setSeated(seated.filter((_, j) => j !== i));
  }

  const rewardDiscount =
    !promo && useReward && availableRewardPercent
      ? Math.round((total * availableRewardPercent) / 100)
      : 0;
  const discount = promo ? Math.min(promo.discountKobo, total) : rewardDiscount;
  const grandTotal = Math.max(0, total - discount);

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoMsg(null);
    setChecking(true);
    const r = await previewPromoCode(code, total);
    setChecking(false);
    if (r.ok) {
      setPromo({ code, discountKobo: r.discountKobo });
      setUseReward(false);
    } else {
      setPromo(null);
      setPromoMsg(r.reason);
    }
  }
  function removePromo() {
    setPromo(null);
    setPromoInput("");
    setPromoMsg(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (seated.length !== maxSeats) {
      setError(`Add a passenger for each of your ${maxSeats} seat${maxSeats > 1 ? "s" : ""}.`);
      return;
    }
    const passengers = seated.map((p, i) => ({
      seat_id: seatIds[i],
      full_name: p.full_name,
      phone: p.phone,
      type: p.type,
    }));
    const cleanInfants = infants.filter((i) => i.full_name.trim());
    if (cleanInfants.some((i) => !i.full_name.trim())) return;
    // Spread the total bags evenly across seats so each passenger's first (free)
    // bag still applies, then declare per seat.
    const luggage = seatIds
      .map((seat_id, i) => ({
        seat_id,
        type: "medium_bag",
        quantity: Math.floor(bagCount / maxSeats) + (i < bagCount % maxSeats ? 1 : 0),
      }))
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
        promoCode: promo?.code,
        useReferralReward: !promo && useReward,
        agreedTerms,
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-foreground text-sm font-semibold">
            Passengers{" "}
            <span className="text-subtle font-normal">
              — {seated.length} of {maxSeats} seat{maxSeats > 1 ? "s" : ""} assigned
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={seated.length >= maxSeats}
              onClick={() => addSeated("adult")}
            >
              <Plus className="size-4" /> Add adult
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={seated.length >= maxSeats}
              onClick={() => addSeated("child_6_10")}
            >
              <Plus className="size-4" /> Add child
            </Button>
          </div>
        </div>

        {seated.length === 0 ? (
          <p className="text-subtle text-xs">
            Add an adult or child for each of your {maxSeats} seat{maxSeats > 1 ? "s" : ""}.
          </p>
        ) : (
          seated.map((p, i) => (
            <div
              key={i}
              className="grid gap-3 sm:grid-cols-[56px_1fr_120px_1fr_76px_32px] sm:items-center"
            >
              <span className="bg-brand-ink inline-flex h-10 items-center justify-center rounded-md text-sm font-semibold text-white">
                {labelFor(seatIds[i])}
              </span>
              <input
                className={field}
                required
                placeholder="Passenger name"
                value={p.full_name}
                onChange={(e) => updateSeated(i, { full_name: e.target.value })}
              />
              <span className="bg-surface-muted text-muted inline-flex h-10 items-center justify-center rounded-md px-2 text-center text-xs font-medium">
                {p.type === "adult" ? "Adult" : "Child (6–10)"}
              </span>
              <input
                className={field}
                placeholder="Phone (optional)"
                value={p.phone}
                onChange={(e) => updateSeated(i, { phone: e.target.value })}
              />
              <span className="text-foreground text-right text-sm font-medium sm:text-center">
                {formatKobo(fareForSeatedType(p.type, seatBase(seatIds[i])))}
              </span>
              <button
                type="button"
                aria-label="Remove passenger"
                className="text-subtle hover:text-danger justify-self-center"
                onClick={() => removeSeated(i)}
              >
                <X className="size-4" />
              </button>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-foreground text-sm font-semibold">Luggage</h3>
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">Number of bags in your luggage</span>
          <input
            className={`${field} max-w-[110px]`}
            type="number"
            min={0}
            max={50}
            inputMode="numeric"
            placeholder="0"
            title="Number of bags"
            value={bagCount ? String(bagCount) : ""}
            onChange={(e) => setBagCount(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
          />
          <span className="text-subtle text-xs">bag(s)</span>
        </label>
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

      <section className="space-y-3">
        <h3 className="text-foreground text-sm font-semibold">Promo code</h3>
        {promo ? (
          <div className="bg-success-soft text-success flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm">
            <span>
              <span className="font-semibold">{promo.code}</span> applied — you save{" "}
              {formatKobo(discount)}
            </span>
            <button
              type="button"
              onClick={removePromo}
              className="text-success/80 hover:text-success"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex gap-2">
              <input
                className={`${field} uppercase`}
                placeholder="Enter code"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyPromo}
                disabled={checking || !promoInput.trim()}
              >
                {checking ? "Checking…" : "Apply"}
              </Button>
            </div>
            {promoMsg && <p className="text-danger text-xs">{promoMsg}</p>}
          </div>
        )}

        {availableRewardPercent != null && (
          <label className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <span className="text-sm">
              <span className="text-foreground font-medium">Use your referral reward</span>{" "}
              <span className="text-muted">— {availableRewardPercent}% off this booking</span>
            </span>
            <input
              type="checkbox"
              checked={!promo && useReward}
              disabled={!!promo}
              onChange={(e) => setUseReward(e.target.checked)}
              className="size-5 accent-[var(--color-primary)]"
            />
          </label>
        )}
      </section>

      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="text-muted space-y-1 text-xs font-medium">
          Pay with
          <div className={`${field} flex max-w-[200px] items-center font-semibold`}>Paystack</div>
        </div>
        <div className="space-y-0.5 text-right">
          {discount > 0 && (
            <>
              <p className="text-muted text-sm">
                Subtotal <span className="text-foreground">{formatKobo(total)}</span>
              </p>
              <p className="text-success text-sm">− {formatKobo(discount)} discount</p>
            </>
          )}
          <p className="text-muted text-sm">Total</p>
          <p className="text-foreground font-display text-2xl font-semibold">
            {formatKobo(grandTotal)}
          </p>
        </div>
      </section>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={agreedTerms}
          onChange={(e) => setAgreedTerms(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
        />
        <span className="text-muted">
          I agree to the{" "}
          <a href="/terms" target="_blank" className="text-primary font-medium">
            Terms &amp; Conditions
          </a>{" "}
          and the{" "}
          <a href="/boarding-policy" target="_blank" className="text-primary font-medium">
            Boarding Policy
          </a>
          .
        </span>
      </label>

      {error && <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={pending || !agreedTerms || !allSeatsAssigned}
      >
        {pending ? "Processing…" : `Pay securely with Paystack · ${formatKobo(grandTotal)}`}
      </Button>
    </form>
  );
}
