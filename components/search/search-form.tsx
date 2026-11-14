"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { fieldClass as field } from "@/components/ui/field";
import type { RouteOptions } from "@/features/search/queries";

export function SearchForm({
  routes,
  initial,
}: {
  routes: RouteOptions;
  initial?: { origin?: string; dest?: string; date?: string; pax?: string; category?: string };
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const origins = routes.origins;
  // Resolve a valid starting origin (from the URL if it's still bookable).
  const startOrigin =
    initial?.origin && routes.destinationsByOrigin[initial.origin]
      ? initial.origin
      : (origins[0]?.id ?? "");
  const startDests = routes.destinationsByOrigin[startOrigin] ?? [];
  const startDest =
    initial?.dest && startDests.some((d) => d.id === initial.dest)
      ? initial.dest
      : (startDests[0]?.id ?? "");

  const [f, setF] = useState({
    origin: startOrigin,
    dest: startDest,
    date: initial?.date ?? today,
    pax: initial?.pax ?? "1",
    category: initial?.category ?? "any",
  });

  const destOptions = useMemo(
    () => routes.destinationsByOrigin[f.origin] ?? [],
    [routes, f.origin],
  );

  function chooseOrigin(origin: string) {
    const dests = routes.destinationsByOrigin[origin] ?? [];
    const dest = dests.some((d) => d.id === f.dest) ? f.dest : (dests[0]?.id ?? "");
    setF({ ...f, origin, dest });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.origin || !f.dest) return;
    const q = new URLSearchParams(f).toString();
    router.push(`/search?${q}`);
  }

  if (origins.length === 0) {
    return (
      <div className="border-border bg-surface text-muted rounded-xl border p-6 text-center text-sm shadow-[var(--shadow-card)]">
        No trips are open for booking right now. Please check back soon.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border-border bg-surface grid gap-3 rounded-xl border p-4 shadow-[var(--shadow-card)] md:grid-cols-[1fr_1fr_1fr_90px_1fr_auto] md:items-end"
    >
      <label className="text-muted space-y-1 text-xs font-medium">
        From
        <select className={field} value={f.origin} onChange={(e) => chooseOrigin(e.target.value)}>
          {origins.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted space-y-1 text-xs font-medium">
        To
        <select
          className={field}
          value={f.dest}
          onChange={(e) => setF({ ...f, dest: e.target.value })}
        >
          {destOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted space-y-1 text-xs font-medium">
        Date
        <input
          type="date"
          className={field}
          value={f.date}
          min={today}
          onChange={(e) => setF({ ...f, date: e.target.value })}
        />
      </label>
      <label className="text-muted space-y-1 text-xs font-medium">
        Pax
        <input
          type="number"
          min={1}
          max={10}
          className={field}
          value={f.pax}
          onChange={(e) => setF({ ...f, pax: e.target.value })}
        />
      </label>
      <label className="text-muted space-y-1 text-xs font-medium">
        Category
        <select
          className={field}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          <option value="any">Any</option>
          <option value="eighteen_seater">18-Seater</option>
          <option value="coaster">Coaster</option>
          <option value="luxury_coach">Luxury Coach</option>
        </select>
      </label>
      <Button type="submit" size="md">
        Search
      </Button>
    </form>
  );
}
