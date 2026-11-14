"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RouteOptions } from "@/features/search/queries";

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function prettyDate(iso: string) {
  const today = new Date().toISOString().slice(0, 10);
  const label = new Date(iso + "T00:00:00").toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return iso === today ? `Today, ${label.replace(/^\w+,\s/, "")}` : label;
}

export function HeroSearch({ routes }: { routes: RouteOptions }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const origins = routes.origins;
  const firstOrigin = origins[0]?.id ?? "";

  const [trip, setTrip] = useState<"one_way" | "return">("one_way");
  const [origin, setOrigin] = useState(firstOrigin);
  const [dest, setDest] = useState((routes.destinationsByOrigin[firstOrigin] ?? [])[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [returnDate, setReturnDate] = useState(addDays(today, 2));
  const [pax, setPax] = useState({ adults: 1, children: 0, infants: 0 });
  const [paxOpen, setPaxOpen] = useState(false);

  const seated = Math.max(1, pax.adults + pax.children);
  const paxSummary = useMemo(() => {
    const parts: string[] = [];
    if (pax.adults) parts.push(`${pax.adults} Adult${pax.adults > 1 ? "s" : ""}`);
    if (pax.children) parts.push(`${pax.children} Child${pax.children > 1 ? "ren" : ""}`);
    if (pax.infants) parts.push(`${pax.infants} Infant${pax.infants > 1 ? "s" : ""}`);
    return parts.join(", ") || "1 Adult";
  }, [pax]);

  const destOptions = useMemo(() => routes.destinationsByOrigin[origin] ?? [], [routes, origin]);

  function chooseOrigin(id: string) {
    setOrigin(id);
    const opts = routes.destinationsByOrigin[id] ?? [];
    if (!opts.some((o) => o.id === dest)) setDest(opts[0]?.id ?? "");
  }

  function swap() {
    // Only swap if the reversed route is itself bookable.
    const opts = routes.destinationsByOrigin[dest] ?? [];
    if (opts.length === 0) return;
    const prevOrigin = origin;
    setOrigin(dest);
    setDest(opts.some((o) => o.id === prevOrigin) ? prevOrigin : (opts[0]?.id ?? ""));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !dest) return;
    const q = new URLSearchParams({ origin, dest, date, pax: String(seated) }).toString();
    router.push(`/search?${q}`);
  }

  if (origins.length === 0) {
    return (
      <div className="glass mx-auto w-full max-w-4xl rounded-2xl p-6 text-center shadow-[var(--shadow-lift)] ring-1 ring-black/5">
        <p className="text-foreground text-sm font-medium">
          No trips are open for booking right now.
        </p>
        <p className="text-muted mt-1 text-sm">
          Please check back soon — new departures are added daily.
        </p>
      </div>
    );
  }

  const cell = "flex flex-col gap-1 px-3 py-2.5 text-left";
  const label = "text-subtle text-[11px] font-semibold uppercase tracking-wide";
  const control = "w-full bg-transparent text-sm font-medium text-foreground focus:outline-none";

  return (
    <form
      onSubmit={submit}
      className="glass mx-auto w-full max-w-4xl rounded-2xl p-2.5 shadow-[var(--shadow-lift)] ring-1 ring-black/5 sm:p-3"
    >
      {/* Trip type */}
      <div className="flex items-center gap-1 px-1.5 pb-2.5">
        {(["one_way", "return"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTrip(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              trip === t ? "bg-brand-ink text-white" : "text-muted hover:bg-black/5",
            )}
          >
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-full border",
                trip === t ? "border-white" : "border-border-strong",
              )}
            >
              {trip === t && <span className="bg-accent size-1.5 rounded-full" />}
            </span>
            {t === "one_way" ? "One way" : "Return"}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="border-border grid grid-cols-1 divide-y divide-[color:var(--color-border)] overflow-visible rounded-xl border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-[1fr_1fr_1.1fr_1fr_auto]">
        {/* From */}
        <div className={cn(cell, "relative")}>
          <span className={label}>From</span>
          <div className="flex items-center gap-2">
            <MapPin className="text-accent-strong size-4 shrink-0" />
            <select
              className={control}
              value={origin}
              onChange={(e) => chooseOrigin(e.target.value)}
            >
              {origins.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {/* Swap button (between From and To) */}
          <button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            className="border-border bg-surface text-muted hover:text-primary absolute top-1/2 right-0 z-10 hidden size-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm sm:flex"
          >
            <ArrowLeftRight className="size-3.5" />
          </button>
        </div>

        {/* To */}
        <div className={cell}>
          <span className={label}>To</span>
          <div className="flex items-center gap-2">
            <MapPin className="text-accent-strong size-4 shrink-0" />
            <select className={control} value={dest} onChange={(e) => setDest(e.target.value)}>
              {destOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Departure */}
        <div className={cell}>
          <span className={label}>Departure</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous day"
              disabled={date <= today}
              onClick={() => setDate(addDays(date, -1))}
              className="text-muted hover:text-primary disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <label className="relative flex-1 cursor-pointer">
              <span className="text-foreground text-sm font-medium">{prettyDate(date)}</span>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value || today)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Departure date"
              />
            </label>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => setDate(addDays(date, 1))}
              className="text-muted hover:text-primary"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          {trip === "return" && (
            <input
              type="date"
              min={date}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              aria-label="Return date"
              className="text-muted mt-1 w-full bg-transparent text-xs focus:outline-none"
            />
          )}
        </div>

        {/* Passengers */}
        <div className={cn(cell, "relative")}>
          <span className={label}>Passengers</span>
          <button
            type="button"
            onClick={() => setPaxOpen((v) => !v)}
            className="flex items-center gap-2 text-left"
          >
            <Users className="text-accent-strong size-4 shrink-0" />
            <span className="text-foreground truncate text-sm font-medium">{paxSummary}</span>
          </button>
          {paxOpen && (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setPaxOpen(false)}
              />
              <div className="border-border bg-surface absolute top-full left-0 z-30 mt-2 w-64 space-y-3 rounded-xl border p-3 shadow-[var(--shadow-pop)]">
                <Stepper
                  label="Adults"
                  hint="12+"
                  value={pax.adults}
                  min={0}
                  onChange={(v) => setPax({ ...pax, adults: v })}
                />
                <Stepper
                  label="Children"
                  hint="6–10 · half fare"
                  value={pax.children}
                  min={0}
                  onChange={(v) => setPax({ ...pax, children: v })}
                />
                <Stepper
                  label="Infants"
                  hint="1–5 · free, on lap"
                  value={pax.infants}
                  min={0}
                  onChange={(v) => setPax({ ...pax, infants: v })}
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={() => setPaxOpen(false)}
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="p-2">
          <Button type="submit" className="h-full w-full gap-2 sm:min-h-12" size="lg">
            <Search className="size-4" /> Search
          </Button>
        </div>
      </div>
    </form>
  );
}

function Stepper({
  label,
  hint,
  value,
  min,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex size-8 items-center justify-center rounded-full border border-border-strong text-foreground disabled:opacity-30 hover:border-primary";
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-foreground text-sm font-medium">{label}</p>
        <p className="text-subtle text-[11px]">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Fewer ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(value + 1)}
          aria-label={`More ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
