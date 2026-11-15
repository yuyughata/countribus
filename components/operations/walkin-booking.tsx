"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { Armchair, Plus, Ticket, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldClass as field, labelClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { formatKobo } from "@/lib/money";
import {
  createWalkInBooking,
  loadWalkinSeatMap,
  type WalkinSeat,
} from "@/features/walkin/actions";
import type { WalkinSchedule } from "@/features/walkin/queries";
import type { CounterMethod } from "@/lib/supabase/database.types";

type Pax = { seat_id: string; seat_label: string; full_name: string; phone: string; type: "adult" | "child_6_10" };

const METHODS: { value: CounterMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS card" },
  { value: "transfer", label: "Bank transfer" },
];

export function WalkinBooking({ schedules }: { schedules: WalkinSchedule[] }) {
  const [scheduleId, setScheduleId] = useState("");
  const [seats, setSeats] = useState<WalkinSeat[]>([]);
  const [pax, setPax] = useState<Pax[]>([]);
  const [infants, setInfants] = useState<{ full_name: string }[]>([]);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [method, setMethod] = useState<CounterMethod>("cash");
  const [loadingSeats, startSeats] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; amountKobo: number } | null>(null);

  const schedule = schedules.find((s) => s.id === scheduleId) ?? null;
  const baseFare = schedule?.base_fare_kobo ?? 0;

  const estimate = useMemo(() => {
    let total = 0;
    for (const p of pax) {
      const seat = seats.find((s) => s.seat_id === p.seat_id);
      const base = baseFare + (seat?.surcharge_kobo ?? 0);
      total += p.type === "child_6_10" ? Math.round(base / 2) : base;
    }
    return total;
  }, [pax, seats, baseFare]);

  function pickSchedule(id: string) {
    setScheduleId(id);
    setSeats([]);
    setPax([]);
    setInfants([]);
    setDone(null);
    setError(null);
    if (!id) return;
    startSeats(async () => {
      setSeats(await loadWalkinSeatMap(id));
    });
  }

  function toggleSeat(seat: WalkinSeat) {
    if (seat.state !== "available") return;
    setPax((cur) => {
      const existing = cur.find((p) => p.seat_id === seat.seat_id);
      if (existing) return cur.filter((p) => p.seat_id !== seat.seat_id);
      return [
        ...cur,
        { seat_id: seat.seat_id, seat_label: seat.seat_label, full_name: "", phone: "", type: "adult" },
      ];
    });
  }

  function updatePax(seatId: string, patch: Partial<Pax>) {
    setPax((cur) => cur.map((p) => (p.seat_id === seatId ? { ...p, ...patch } : p)));
  }

  function submit() {
    setError(null);
    // Default the lead contact from the first passenger if left blank.
    const lead = {
      name: contact.name.trim() || pax[0]?.full_name.trim() || "",
      phone: contact.phone.trim() || pax[0]?.phone.trim() || "",
      email: contact.email.trim() || undefined,
    };
    startSubmit(async () => {
      const r = await createWalkInBooking({
        scheduleId,
        method,
        contact: lead,
        passengers: pax.map((p) => ({
          seat_id: p.seat_id,
          full_name: p.full_name,
          phone: p.phone || undefined,
          type: p.type,
        })),
        infants: infants.filter((i) => i.full_name.trim()),
      });
      if (r.ok) {
        setDone({ reference: r.reference, amountKobo: r.amountKobo });
        setScheduleId("");
        setSeats([]);
        setPax([]);
        setInfants([]);
        setContact({ name: "", phone: "", email: "" });
        setMethod("cash");
      } else {
        setError(r.error);
      }
    });
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="text-success size-5" /> Walk-in booking confirmed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted text-sm">
            Booking <span className="text-foreground font-semibold">{done.reference}</span> is paid
            ({formatKobo(done.amountKobo)}). The e-ticket is ready to print or send.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/bookings/${done.reference}`}>
              <Button size="sm" variant="primary">
                View booking &amp; tickets
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => setDone(null)}>
              <Plus className="size-4" /> New walk-in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New walk-in booking</CardTitle>
        {schedule && (
          <Badge tone="neutral">
            {pax.length} seat{pax.length === 1 ? "" : "s"} · {formatKobo(estimate)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <label className={labelClass}>
          Trip
          <select className={field} value={scheduleId} onChange={(e) => pickSchedule(e.target.value)}>
            <option value="">Select a departure…</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id} disabled={s.available === 0}>
                {s.origin} → {s.destination} ·{" "}
                {new Date(s.departure_at).toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · {s.available} seat{s.available === 1 ? "" : "s"} left
              </option>
            ))}
          </select>
        </label>

        {schedules.length === 0 && (
          <p className="text-muted text-sm">
            No upcoming published departures. Publish a schedule to sell walk-in tickets.
          </p>
        )}

        {scheduleId && (
          <div>
            <p className={cn(labelClass, "mb-2")}>Seats {loadingSeats && "…"}</p>
            {seats.length === 0 && !loadingSeats ? (
              <p className="text-muted text-sm">No seats found for this trip.</p>
            ) : (
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {seats.map((seat) => {
                  const selected = pax.some((p) => p.seat_id === seat.seat_id);
                  const available = seat.state === "available";
                  return (
                    <button
                      key={seat.seat_id}
                      type="button"
                      disabled={!available}
                      onClick={() => toggleSeat(seat)}
                      aria-pressed={selected}
                      title={available ? "Available" : seat.state}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary text-white"
                          : available
                            ? "border-border text-foreground hover:border-primary"
                            : "border-border/60 text-subtle bg-surface-muted cursor-not-allowed",
                      )}
                    >
                      <Armchair className="size-3.5" />
                      {seat.seat_label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {pax.length > 0 && (
          <div className="space-y-2">
            <p className={labelClass}>Passengers</p>
            {pax.map((p) => (
              <div
                key={p.seat_id}
                className="border-border grid grid-cols-1 items-end gap-2 rounded-lg border p-2 sm:grid-cols-[auto_1fr_1fr_auto]"
              >
                <Badge tone="info" className="w-fit gap-1">
                  <Armchair className="size-3" /> {p.seat_label}
                </Badge>
                <input
                  className={field}
                  placeholder="Full name"
                  value={p.full_name}
                  onChange={(e) => updatePax(p.seat_id, { full_name: e.target.value })}
                />
                <input
                  className={field}
                  placeholder="Phone (optional)"
                  value={p.phone}
                  onChange={(e) => updatePax(p.seat_id, { phone: e.target.value })}
                />
                <select
                  className={field}
                  value={p.type}
                  onChange={(e) => updatePax(p.seat_id, { type: e.target.value as Pax["type"] })}
                >
                  <option value="adult">Adult</option>
                  <option value="child_6_10">Child 6–10 (½)</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {scheduleId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={labelClass}>Lap infants (1–5, free, no seat)</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setInfants((cur) => [...cur, { full_name: "" }])}
              >
                <UserPlus className="size-4" /> Add infant
              </Button>
            </div>
            {infants.map((inf, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={field}
                  placeholder="Infant full name"
                  value={inf.full_name}
                  onChange={(e) =>
                    setInfants((cur) => cur.map((x, j) => (j === i ? { full_name: e.target.value } : x)))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setInfants((cur) => cur.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {pax.length > 0 && (
          <>
            <div className="border-border grid gap-3 border-t pt-4 sm:grid-cols-3">
              <label className={labelClass}>
                Lead passenger name
                <input
                  className={field}
                  placeholder={pax[0]?.full_name || "Name"}
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                />
              </label>
              <label className={labelClass}>
                Phone
                <input
                  className={field}
                  placeholder={pax[0]?.phone || "Phone"}
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
              </label>
              <label className={labelClass}>
                Email (optional)
                <input
                  className={field}
                  placeholder="For the e-ticket"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </label>
            </div>

            <div>
              <p className={cn(labelClass, "mb-1")}>Payment method</p>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium",
                      method === m.value
                        ? "border-primary text-primary bg-primary-soft"
                        : "border-border text-muted hover:text-foreground",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-border flex items-center justify-between border-t pt-3">
              <span className="text-muted text-sm">
                Total to collect:{" "}
                <span className="text-foreground text-base font-semibold">{formatKobo(estimate)}</span>
              </span>
              <Button type="button" disabled={submitting} onClick={submit}>
                {submitting ? "Recording…" : "Record payment & issue ticket"}
              </Button>
            </div>
          </>
        )}

        {error && (
          <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
