"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Opt = { id: string; label: string };

const field =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none";

export function SearchForm({
  terminals,
  initial,
}: {
  terminals: Opt[];
  initial?: { origin?: string; dest?: string; date?: string; pax?: string; category?: string };
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    origin: initial?.origin ?? terminals[0]?.id ?? "",
    dest: initial?.dest ?? terminals[1]?.id ?? "",
    date: initial?.date ?? today,
    pax: initial?.pax ?? "1",
    category: initial?.category ?? "any",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams(f).toString();
    router.push(`/search?${q}`);
  }

  return (
    <form
      onSubmit={submit}
      className="border-border bg-surface grid gap-3 rounded-xl border p-4 shadow-[var(--shadow-card)] md:grid-cols-[1fr_1fr_1fr_90px_1fr_auto] md:items-end"
    >
      <label className="text-muted space-y-1 text-xs font-medium">
        From
        <select
          className={field}
          value={f.origin}
          onChange={(e) => setF({ ...f, origin: e.target.value })}
        >
          {terminals.map((t) => (
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
          {terminals.map((t) => (
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
