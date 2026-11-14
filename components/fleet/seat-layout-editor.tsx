"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { saveSeatTemplate } from "@/features/fleet/actions";
import { cn } from "@/lib/utils";

type Tool = "standard" | "empty" | "driver" | "wc" | "entrance" | "amenity";

const TOOLS: { key: Tool; label: string }[] = [
  { key: "standard", label: "Seat" },
  { key: "empty", label: "Empty" },
  { key: "driver", label: "Driver" },
  { key: "wc", label: "W/C" },
  { key: "entrance", label: "Entrance" },
  { key: "amenity", label: "Tea/Coffee" },
];

const TOOL_STYLE: Record<Tool, string> = {
  standard: "bg-surface border-border-strong text-foreground",
  empty: "bg-canvas border-dashed border-border text-subtle",
  driver: "bg-warning-soft border-warning text-warning",
  wc: "bg-teal-soft border-teal text-teal",
  entrance: "bg-success-soft border-success text-success",
  amenity: "bg-primary-soft border-primary text-primary",
};
const FIXTURE_ABBR: Partial<Record<Tool, string>> = {
  driver: "D",
  wc: "WC",
  entrance: "EN",
  amenity: "☕",
  empty: "",
};
const isSeatTool = (t: Tool) => t === "standard";

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
  const [rows, setRows] = useState(10);
  const [columns, setColumns] = useState(4);
  const [tool, setTool] = useState<Tool>("standard");
  const [cells, setCells] = useState<Record<string, Tool>>({}); // default unpainted = standard seat

  const cellTool = (r: number, c: number): Tool => cells[`${r}-${c}`] ?? "standard";

  const stats = useMemo(() => {
    let seats = 0;
    for (let r = 1; r <= rows; r++)
      for (let c = 1; c <= columns; c++) if (isSeatTool(cellTool(r, c))) seats++;
    return { seats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, cells]);

  function paint(r: number, c: number) {
    setCells((prev) => ({ ...prev, [`${r}-${c}`]: tool }));
  }

  function save() {
    setError(null);
    const seats: {
      seatLabel: string;
      row: number;
      col: number;
      seatType: "standard" | "driver" | "wc" | "entrance" | "amenity" | "empty";
      isSellable: boolean;
      seatClass: string;
      surchargeKobo: number;
    }[] = [];
    for (let r = 1; r <= rows; r++)
      for (let c = 1; c <= columns; c++) {
        const t = cellTool(r, c);
        if (t === "empty") continue;
        const seat = isSeatTool(t);
        seats.push({
          seatLabel: seat ? `${r}${String.fromCharCode(64 + c)}` : `${t[0].toUpperCase()}${r}-${c}`,
          row: r,
          col: c,
          seatType: seat ? "standard" : (t as "driver" | "wc" | "entrance" | "amenity"),
          isSellable: seat,
          seatClass: seat ? "standard" : "fixture",
          surchargeKobo: 0,
        });
      }
    start(async () => {
      const r = await saveSeatTemplate({ vendorId, vehicleId, name, rows, columns, seats });
      if (!r.ok) setError(r.error);
      else router.push("/dashboard/fleet");
    });
  }

  const num = cn(fieldClass, "h-9 w-20");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-muted space-y-1 text-xs font-medium">
          Layout name
          <input
            className={cn(num, "w-48")}
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
            max={8}
            value={columns}
            onChange={(e) => setColumns(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
          />
        </label>
      </div>

      <div>
        <p className="text-muted mb-2 text-xs font-medium">
          Palette — pick a tool, then click cells
        </p>
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTool(t.key)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium",
                TOOL_STYLE[t.key],
                tool === t.key && "ring-primary ring-2 ring-offset-1",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-border bg-canvas inline-block space-y-2 rounded-lg border p-4">
        <p className="text-subtle mb-1 text-center text-[11px] tracking-wide">FRONT</p>
        {Array.from({ length: rows }, (_, ri) => ri + 1).map((r) => (
          <div key={r} className="flex justify-center gap-1.5">
            {Array.from({ length: columns }, (_, ci) => ci + 1).map((c) => {
              const t = cellTool(r, c);
              const seat = isSeatTool(t);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => paint(r, c)}
                  title={t}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border text-[11px] font-medium",
                    TOOL_STYLE[t],
                  )}
                >
                  {seat ? `${r}${String.fromCharCode(64 + c)}` : (FIXTURE_ABBR[t] ?? "")}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-muted text-sm">{stats.seats} sellable seats</p>
      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={save} disabled={pending || stats.seats === 0}>
          {pending ? "Saving…" : `Save & publish layout for ${vehicleName}`}
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard/fleet")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
