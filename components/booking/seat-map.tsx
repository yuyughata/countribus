"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { holdSeats } from "@/features/booking/actions";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SeatCell } from "@/features/booking/queries";

type Eff = "available" | "booked" | "held" | "blocked" | "selected";

const LEGEND: { key: Eff; label: string; cls: string }[] = [
  { key: "available", label: "Available", cls: "bg-success-soft border-success text-success" },
  { key: "selected", label: "Selected", cls: "bg-info text-white border-info" },
  { key: "held", label: "Held", cls: "bg-warning-soft border-warning text-warning" },
  { key: "booked", label: "Booked", cls: "bg-danger-soft border-danger text-danger" },
  { key: "blocked", label: "Blocked", cls: "bg-surface-muted border-border text-subtle" },
];
const CLS: Record<Eff, string> = Object.fromEntries(LEGEND.map((l) => [l.key, l.cls])) as Record<
  Eff,
  string
>;

function effState(s: SeatCell, selected: Set<string>): Eff {
  if (selected.has(s.seat_id)) return "selected";
  if (s.state === "held" && s.held_until && new Date(s.held_until) < new Date()) return "available";
  return s.state;
}

function parse(label: string) {
  const m = label.match(/^(\d+)(.*)$/);
  return { row: m ? parseInt(m[1], 10) : 0, col: m ? m[2] : label };
}

export function SeatMap({
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const byRow = new Map<number, SeatCell[]>();
    for (const s of [...seats].sort((a, b) =>
      a.seat_label.localeCompare(b.seat_label, undefined, { numeric: true }),
    )) {
      const { row } = parse(s.seat_label);
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row)!.push(s);
    }
    return [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [seats]);

  function toggle(s: SeatCell) {
    const eff = effState(s, selected);
    if (eff !== "available" && eff !== "selected") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s.seat_id)) next.delete(s.seat_id);
      else if (next.size < 10) next.add(s.seat_id);
      return next;
    });
  }

  function proceed() {
    setError(null);
    const ids = [...selected];
    if (ids.length === 0) return;
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    start(async () => {
      const r = await holdSeats(scheduleId, ids, token);
      if (!r.ok) {
        setError(r.error);
        router.refresh();
      } else {
        try {
          sessionStorage.setItem(
            `hold:${scheduleId}`,
            JSON.stringify({ token, seatIds: ids, expiresAt: r.expiresAt }),
          );
        } catch {}
        router.push(`/book/${scheduleId}/passengers?token=${token}`);
      }
    });
  }

  const total = selected.size * fareKobo;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 text-xs">
        {LEGEND.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5">
            <span className={cn("size-4 rounded border", l.cls)} /> {l.label}
          </span>
        ))}
      </div>

      <div className="border-border bg-canvas inline-block space-y-2 rounded-lg border p-4">
        <p className="text-subtle mb-2 text-center text-[11px] tracking-wide">FRONT</p>
        {rows.map((row, i) => (
          <div key={i} className="flex justify-center gap-2">
            {row.map((s) => {
              const eff = effState(s, selected);
              const clickable = eff === "available" || eff === "selected";
              return (
                <button
                  key={s.seat_id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => toggle(s)}
                  title={`${s.seat_label} · ${eff}`}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                    CLS[eff],
                    !clickable && "cursor-not-allowed opacity-80",
                  )}
                >
                  {s.seat_label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="text-muted text-sm">
          {selected.size} seat{selected.size === 1 ? "" : "s"} ·{" "}
          <span className="text-foreground font-semibold">{formatKobo(total)}</span>
        </div>
        <Button onClick={proceed} disabled={pending || selected.size === 0}>
          {pending ? "Holding seats…" : "Hold seats & continue"}
        </Button>
      </div>
      <p className="text-subtle text-xs">
        Seats are held for 10 minutes while you complete booking.
      </p>
    </div>
  );
}
