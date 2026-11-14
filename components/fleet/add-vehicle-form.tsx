"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { createVehicle } from "@/features/fleet/actions";

export function AddVehicleForm({
  vendorId,
  categories,
}: {
  vendorId: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? "",
    registrationNo: "",
    displayName: "",
    capacity: "30",
  });

  const field = fieldClass;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createVehicle({ vendorId, ...form });
      if (!r.ok) setError(r.error);
      else {
        setForm((f) => ({ ...f, registrationNo: "", displayName: "" }));
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_100px_auto] sm:items-end"
    >
      <label className="text-muted space-y-1 text-xs font-medium">
        Category
        <select
          className={field}
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted space-y-1 text-xs font-medium">
        Plate number
        <input
          className={field}
          required
          value={form.registrationNo}
          onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
          placeholder="LAG-123-AB"
        />
      </label>
      <label className="text-muted space-y-1 text-xs font-medium">
        Display name
        <input
          className={field}
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          placeholder="Optional"
        />
      </label>
      <label className="text-muted space-y-1 text-xs font-medium">
        Capacity
        <input
          className={field}
          type="number"
          min={1}
          max={100}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add vehicle"}
      </Button>
      {error && <p className="text-danger text-xs sm:col-span-5">{error}</p>}
    </form>
  );
}
