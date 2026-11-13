"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { saveSeatTemplate } from "@/features/fleet/actions";
import { cn } from "@/lib/utils";

type SeatType = "standard" | "window" | "aisle" | "driver" | "blocked";

const CYCLE: SeatType[] = ["standard", "window", "aisle", "driver", "blocked"];
const SELLABLE: Record<SeatType, boolean> = {
  standard: true,
  window: true,
  aisle: true,
  driver: false,
  blocked: false,
};
const SEAT_STYLE: Record<SeatType, string> = {
  standard: "bg-surface border-border-strong text-foreground",
  window: "bg-info-soft border-info text-info",
  aisle: "bg-violet-soft border-violet text-violet",
  driver: "bg-warning-soft border-warning text-warning",
  blocked: "bg-surface-muted border-border text-subtle line-through",
};

function label(r: number, c: number) {
  return `${r}${String.fromCharCode(64 + c)}`;
}

export function SeatLayoutEditor({
  vendorId,
  vehicleId,
  vehicleName,
}: {
  vendorId: string;
  vehicleId: string;
  vehicleName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Standard layout");
  const [rows, setRows] = useState(8);
  const [columns, setColumns] = useState(4);
  // seatType per "r-c"
  const [types, setTypes] = useState<Record<string, SeatType>>({});

  const grid = useMemo(() => {
    const out: { r: number; c: number; key: string; type: SeatType }[] = [];
    for (let r = 1; r <= rows; r++)
      for (let c = 1; c <= columns; c++) {
        const key = `${r}-${c}`;
        out.push({ r, c, key, type: types[key] ?? "standard" });
      }
    return out;
  }, [rows, columns, types]);

  const sellableCount = grid.filter((s) => SELLABLE[s.type]).length;

  function cycle(key: string, current: SeatType) {
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    setTypes((t) => ({ ...t, [key]: next }));
  }

  function save() {
    setError(null);
    const seats = grid.map((s) => ({
      seatLabel: label(s.r, s.c),
      row: s.r,
      col: s.c,
      seatType: s.type,
      isSellable: SELLABLE[s.type],
    }));
    start(async () => {
      const r = await saveSeatTemplate({ vendorId, vehicleId, name, rows, columns, seats });
      if (!r.ok) setError(r.error);
      else router.push("/dashboard/fleet");
    });
  }

  const num =
    "h-9 w-20 rounded-md border border-border bg-surface px-2 text-sm focus-visible:border-primary focus-visible:outline-none";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-muted space-y-1 text-xs font-medium">
          Layout name
          <input
            className="border-border bg-surface focus-visible:border-primary h-9 w-56 rounded-md border px-2 text-sm focus-visible:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-muted space-y-1 text-xs font-medium">
          Rows
          <input
            className={num}
            type="number"
            min={1}
            max={40}
            value={rows}
            onChange={(e) => setRows(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="text-muted space-y-1 text-xs font-medium">
          Columns
          <input
            className={num}
            type="number"
            min={1}
            max={10}
            value={columns}
            onChange={(e) => setColumns(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          />
        </label>
        <span className="text-muted text-sm">
          {sellableCount} sellable seat{sellableCount === 1 ? "" : "s"}
        </span>
      </div>

      <p className="text-subtle text-xs">
        Click a seat to cycle: standard → window → aisle → driver → blocked. Driver and blocked
        seats are not sold.
      </p>

      <div
        className="border-border bg-canvas inline-grid gap-1.5 rounded-lg border p-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
      >
        {grid.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => cycle(s.key, s.type)}
            title={s.type}
            className={cn(
              "flex size-11 items-center justify-center rounded-md border text-xs font-medium transition-colors",
              SEAT_STYLE[s.type],
            )}
          >
            {label(s.r, s.c)}
          </button>
        ))}
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={save} disabled={pending || sellableCount === 0}>
          {pending ? "Saving…" : `Save & publish layout for ${vehicleName}`}
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard/fleet")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
