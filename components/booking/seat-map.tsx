"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { holdSeats } from "@/features/booking/actions";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SeatCell } from "@/features/booking/queries";

type Eff = "available" | "booked" | "held" | "blocked" | "selected";

const LEGEND: { key: Eff; label: string }[] = [
  { key: "available", label: "Available" },
  { key: "selected", label: "Selected" },
  { key: "held", label: "On hold" },
  { key: "booked", label: "Taken" },
];

/** Per-state seat styling (frame colour + whether it's selectable). */
const SEAT_STYLE: Record<Eff, { color: string; solid: boolean; clickable: boolean }> = {
  available: { color: "var(--color-seat-available)", solid: false, clickable: true },
  selected: { color: "var(--color-seat-selected)", solid: true, clickable: true },
  held: { color: "var(--color-seat-held)", solid: false, clickable: false },
  booked: { color: "var(--color-seat-booked)", solid: false, clickable: false },
  blocked: { color: "var(--color-seat-blocked)", solid: false, clickable: false },
};

function SeatGlyph({ solid }: { solid: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden="true">
      {/* backrest */}
      <rect x="7" y="5" width="26" height="9" rx="3.5" fill="currentColor" />
      {/* armrests */}
      <rect x="3.5" y="12" width="6" height="24" rx="3" fill="currentColor" />
      <rect x="30.5" y="12" width="6" height="24" rx="3" fill="currentColor" />
      {/* cushion */}
      <rect
        x="9"
        y="15"
        width="22"
        height="21"
        rx="4.5"
        fill={solid ? "currentColor" : "#ffffff"}
        opacity={solid ? 1 : 0.82}
      />
    </svg>
  );
}

function effState(s: SeatCell, selected: Set<string>): Eff {
  if (selected.has(s.seat_id)) return "selected";
  if (s.state === "held" && s.held_until && new Date(s.held_until) < new Date()) return "available";
  return s.state;
}

/** "10C" -> { row: 10, col: 3 } (col letter A=1, B=2, …). */
function parse(label: string): { row: number; col: number } {
  const m = label.match(/^(\d+)\s*([A-Za-z]*)$/);
  const row = m ? parseInt(m[1], 10) : 0;
  const letters = m?.[2] ?? "";
  let col = 0;
  for (const ch of letters.toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row, col: col || 1 };
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

  // Arrange seats by their real row/column so the map mirrors the bus layout.
  const { grid, aisleAfter } = useMemo(() => {
    const byPos = new Map<string, SeatCell>();
    let maxRow = 0;
    let maxCol = 0;
    for (const s of seats) {
      const { row, col } = parse(s.seat_label);
      byPos.set(`${row}-${col}`, s);
      if (row > maxRow) maxRow = row;
      if (col > maxCol) maxCol = col;
    }
    const grid: (SeatCell | null)[][] = [];
    for (let r = 1; r <= maxRow; r++) {
      const cols: (SeatCell | null)[] = [];
      for (let c = 1; c <= maxCol; c++) cols.push(byPos.get(`${r}-${c}`) ?? null);
      grid.push(cols);
    }
    // Centre aisle for 3+ seats across (classic coach layout).
    const aisleAfter = maxCol >= 3 ? Math.ceil(maxCol / 2) : 0;
    return { grid, aisleAfter };
  }, [seats]);

  const seatById = useMemo(() => new Map(seats.map((s) => [s.seat_id, s])), [seats]);

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
    const token = crypto.randomUUID();
    start(async () => {
      const r = await holdSeats(scheduleId, ids, token);
      if (!r.ok) {
        setError(r.error);
        router.refresh();
      } else {
        const surcharges = Object.fromEntries(ids.map((id) => [id, surchargeById(id)]));
        try {
          sessionStorage.setItem(
            `hold:${scheduleId}`,
            JSON.stringify({ token, seatIds: ids, surcharges, fareKobo, expiresAt: r.expiresAt }),
          );
        } catch {}
        router.push(`/book/${scheduleId}/passengers?token=${token}`);
      }
    });
  }

  const surchargeById = (id: string) => seatById.get(id)?.surcharge_kobo ?? 0;
  const total = [...selected].reduce((sum, id) => sum + fareKobo + surchargeById(id), 0);

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {LEGEND.map((l) => {
          const st = SEAT_STYLE[l.key];
          return (
            <span key={l.key} className="flex items-center gap-1.5">
              <span className="relative inline-block size-5" style={{ color: st.color }}>
                <SeatGlyph solid={st.solid} />
              </span>
              {l.label}
            </span>
          );
        })}
      </div>

      {/* Bus body */}
      <div className="border-border-strong bg-canvas inline-block rounded-[1.75rem] border-2 p-3 sm:p-4">
        {/* Front: driver + door */}
        <div className="text-subtle mb-3 flex items-center justify-between px-1">
          <span
            aria-hidden
            className="border-border-strong flex size-7 items-center justify-center rounded-full border-2"
            title="Driver"
          >
            <span className="border-border-strong size-3.5 rounded-full border-2" />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.2em]">FRONT</span>
          <span
            aria-hidden
            className="border-border h-7 w-5 rounded-sm border border-dashed"
            title="Door"
          />
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {grid.map((cols, ri) => (
            <div key={ri} className="flex items-center justify-center gap-1.5">
              <span className="text-subtle w-4 text-right text-[10px] tabular-nums">{ri + 1}</span>
              {cols.map((s, ci) => {
                const colNo = ci + 1;
                return (
                  <div key={ci} className="flex items-center">
                    {s ? (
                      <SeatButton
                        seat={s}
                        eff={effState(s, selected)}
                        onToggle={() => toggle(s)}
                      />
                    ) : (
                      <span className="size-9 sm:size-10" aria-hidden />
                    )}
                    {aisleAfter === colNo && <span className="w-4 sm:w-6" aria-hidden />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
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
      <p className="text-subtle text-xs">Seats are held for 10 minutes while you complete booking.</p>
    </div>
  );
}

function SeatButton({
  seat,
  eff,
  onToggle,
}: {
  seat: SeatCell;
  eff: Eff;
  onToggle: () => void;
}) {
  const st = SEAT_STYLE[eff];
  return (
    <button
      type="button"
      disabled={!st.clickable}
      onClick={onToggle}
      title={`${seat.seat_label} · ${eff}`}
      style={{ color: st.color }}
      className={cn(
        "relative flex size-9 items-center justify-center transition-transform sm:size-10",
        st.clickable ? "hover:-translate-y-0.5 cursor-pointer" : "cursor-not-allowed",
        eff === "selected" && "drop-shadow-[0_2px_6px_rgba(11,28,54,0.35)]",
      )}
    >
      <SeatGlyph solid={st.solid} />
      <span
        className={cn(
          "relative text-[9px] font-bold sm:text-[10px]",
          eff === "selected" ? "text-white" : "text-foreground/80",
        )}
      >
        {seat.seat_label}
      </span>
    </button>
  );
}
