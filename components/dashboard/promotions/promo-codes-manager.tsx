"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/field";
import { createPromoCode, deletePromoCode, togglePromoCode } from "@/features/promotions/actions";
import type { PromoCode } from "@/features/promotions/queries";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";

const blank = {
  code: "",
  discountPercent: 10,
  minFareNaira: 0,
  maxDiscountNaira: "",
  maxRedemptions: "",
  maxPerCustomer: "1",
  startsAt: "",
  endsAt: "",
  description: "",
};

export function PromoCodesManager({ codes }: { codes: PromoCode[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ ...blank });

  function num(v: string | number): number {
    return typeof v === "number" ? v : Number(v || 0);
  }
  function optNum(v: string | number): number | null {
    const s = String(v).trim();
    return s === "" ? null : Number(s);
  }

  function create() {
    setErr(null);
    start(async () => {
      const r = await createPromoCode({
        code: f.code,
        description: f.description || undefined,
        discountPercent: num(f.discountPercent),
        minFareNaira: num(f.minFareNaira),
        maxDiscountNaira: optNum(f.maxDiscountNaira),
        maxRedemptions: optNum(f.maxRedemptions),
        maxPerCustomer: optNum(f.maxPerCustomer),
        startsAt: f.startsAt || null,
        endsAt: f.endsAt || null,
        isActive: true,
      });
      if (!r.ok) setErr(r.error);
      else {
        setF({ ...blank });
        router.refresh();
      }
    });
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Something went wrong");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {err && <p className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-sm">{err}</p>}

      {/* Create */}
      <div className="border-border bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>
          Code
          <input
            className={cn(fieldClass, "uppercase")}
            placeholder="SAVE20"
            value={f.code}
            onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
          />
        </label>
        <label className={labelClass}>
          Discount %
          <input
            className={fieldClass}
            type="number"
            min={1}
            max={100}
            value={f.discountPercent}
            onChange={(e) => setF({ ...f, discountPercent: Number(e.target.value) })}
          />
        </label>
        <label className={labelClass}>
          Min fare (₦, optional)
          <input
            className={fieldClass}
            type="number"
            min={0}
            value={f.minFareNaira}
            onChange={(e) => setF({ ...f, minFareNaira: Number(e.target.value) })}
          />
        </label>
        <label className={labelClass}>
          Max discount (₦, optional)
          <input
            className={fieldClass}
            type="number"
            min={0}
            placeholder="No cap"
            value={f.maxDiscountNaira}
            onChange={(e) => setF({ ...f, maxDiscountNaira: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Total uses (optional)
          <input
            className={fieldClass}
            type="number"
            min={1}
            placeholder="Unlimited"
            value={f.maxRedemptions}
            onChange={(e) => setF({ ...f, maxRedemptions: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Uses per customer
          <input
            className={fieldClass}
            type="number"
            min={1}
            placeholder="Unlimited"
            value={f.maxPerCustomer}
            onChange={(e) => setF({ ...f, maxPerCustomer: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Starts (optional)
          <input
            className={fieldClass}
            type="datetime-local"
            value={f.startsAt}
            onChange={(e) => setF({ ...f, startsAt: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Ends (optional)
          <input
            className={fieldClass}
            type="datetime-local"
            value={f.endsAt}
            onChange={(e) => setF({ ...f, endsAt: e.target.value })}
          />
        </label>
        <label className={cn(labelClass, "sm:col-span-2 lg:col-span-1")}>
          Note (optional)
          <input
            className={fieldClass}
            placeholder="Launch promo"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </label>
        <div className="flex items-end lg:col-span-3">
          <Button type="button" onClick={create} disabled={pending || !f.code.trim()}>
            {pending ? "Saving…" : "Create promo code"}
          </Button>
        </div>
      </div>

      {/* List */}
      {codes.length === 0 ? (
        <p className="text-muted text-sm">No promo codes yet.</p>
      ) : (
        <div className="divide-border border-border divide-y overflow-hidden rounded-xl border">
          {codes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-mono text-sm font-semibold">{c.code}</span>
                  <Badge tone={c.is_active ? "success" : "neutral"}>
                    {c.is_active ? "Active" : "Paused"}
                  </Badge>
                  <span className="text-primary text-sm font-semibold">
                    {c.discount_percent}% off
                  </span>
                </div>
                <p className="text-muted mt-0.5 text-xs">
                  {c.min_fare_kobo > 0 && `Min fare ${formatKobo(c.min_fare_kobo)} · `}
                  {c.max_discount_kobo && `Max ${formatKobo(c.max_discount_kobo)} · `}
                  {c.redemptions} used
                  {c.max_redemptions != null && ` / ${c.max_redemptions}`}
                  {c.max_per_customer != null && ` · ${c.max_per_customer}/customer`}
                  {c.ends_at && ` · ends ${new Date(c.ends_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                type="button"
                aria-label={c.is_active ? "Pause" : "Activate"}
                title={c.is_active ? "Pause" : "Activate"}
                disabled={pending}
                onClick={() => act(() => togglePromoCode(c.id, !c.is_active))}
                className="text-subtle hover:text-foreground hover:bg-surface-muted flex size-8 items-center justify-center rounded-md"
              >
                <Power className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Delete"
                title="Delete"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`Delete promo code ${c.code}?`))
                    act(() => deletePromoCode(c.id));
                }}
                className="text-subtle hover:text-danger hover:bg-danger-soft flex size-8 items-center justify-center rounded-md"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
