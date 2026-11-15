"use client";

import { useMemo, useState, useTransition } from "react";

import { Armchair, Check, Copy, ExternalLink, Trash2, UserPlus } from "lucide-react";

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

type Pax = {
  seat_id: string;
  seat_label: string;
  full_name: string;
  phone: string;
  type: "adult" | "child_6_10";
};

type Done = {
  reference: string;
  amountKobo: number;
  paymentUrl: string | null;
  emailed: boolean;
  note?: string;
};

export function WalkinBooking({ schedules }: { schedules: WalkinSchedule[] }) {
  const [scheduleId, setScheduleId] = useState("");
  const [seats, setSeats] = useState<WalkinSeat[]>([]);
  const [pax, setPax] = useState<Pax[]>([]);
  const [infants, setInfants] = useState<{ full_name: string }[]>([]);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [loadingSeats, startSeats] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);

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
    setError(null);
    if (!id) return;
    startSeats(async () => {
      setSeats(await loadWalkinSeatMap(id));
    });
  }

  function toggleSeat(seat: WalkinSeat) {
    if (seat.state !== "available") return;
    setPax((cur) => {
      if (cur.some((p) => p.seat_id === seat.seat_id)) {
        return cur.filter((p) => p.seat_id !== seat.seat_id);
      }
      return [
        ...cur,
        { seat_id: seat.seat_id, seat_label: seat.seat_label, full_name: "", phone: "", type: "adult" },
      ];
    });
  }

  function updatePax(seatId: string, patch: Partial<Pax>) {
    setPax((cur) => cur.map((p) => (p.seat_id === seatId ? { ...p, ...patch } : p)));
  }

  function reset() {
    setDone(null);
    setScheduleId("");
    setSeats([]);
    setPax([]);
    setInfants([]);
    setContact({ name: "", phone: "", email: "" });
    setCopied(false);
  }

  function submit() {
    setError(null);
    const lead = {
      name: contact.name.trim() || pax[0]?.full_name.trim() || "",
      phone: contact.phone.trim() || pax[0]?.phone.trim() || "",
      email: contact.email.trim() || undefined,
    };
    startSubmit(async () => {
      const r = await createWalkInBooking({
        scheduleId,
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
        setDone({
          reference: r.reference,
          amountKobo: r.amountKobo,
          paymentUrl: r.paymentUrl,
          emailed: r.emailed,
          note: r.note,
        });
      } else {
        setError(r.error);
      }
    });
  }

  async function copyLink() {
    if (!done?.paymentUrl) return;
    try {
      await navigator.clipboard.writeText(done.paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="text-success size-5" /> Booking {done.reference} reserved
          </CardTitle>
          <Badge tone="warning">Awaiting payment</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted text-sm">
            Seats are held for 30 minutes. Collect {formatKobo(done.amountKobo)} via the payment
            link below — the passenger can pay by card or bank transfer.
            {done.emailed
              ? " A payment link has been emailed to the passenger."
              : done.paymentUrl
                ? " Share the payment link with the passenger."
                : ""}
          </p>

          {done.paymentUrl ? (
            <div className="border-border flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
              <code className="text-foreground min-w-0 flex-1 truncate text-xs">
                {done.paymentUrl}
              </code>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <a href={done.paymentUrl} target="_blank" rel="noreferrer">
                  <Button type="button" size="sm" variant="primary">
                    <ExternalLink className="size-4" /> Open payment
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            done.note && (
              <p className="bg-surface-muted text-muted rounded-md px-3 py-2 text-sm">{done.note}</p>
            )
          )}

          <Button type="button" size="sm" variant="ghost" onClick={reset}>
            New walk-in booking
          </Button>
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
                Email (for the payment link)
                <input
                  className={field}
                  placeholder="passenger@email.com"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </label>
            </div>

            <div className="border-border flex items-center justify-between border-t pt-3">
              <span className="text-muted text-sm">
                Amount to pay:{" "}
                <span className="text-foreground text-base font-semibold">{formatKobo(estimate)}</span>
              </span>
              <Button type="button" disabled={submitting} onClick={submit}>
                {submitting ? "Reserving…" : "Create booking & payment link"}
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
