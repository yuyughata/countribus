"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/field";
import { saveReferralProgram } from "@/features/promotions/actions";
import type { ReferralProgram } from "@/features/promotions/queries";
import { koboToNaira } from "@/lib/money";

export function ReferralProgramEditor({ initial }: { initial: ReferralProgram }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [v, setV] = useState({
    isEnabled: initial.is_enabled,
    referrerPercent: initial.referrer_percent,
    minQualifyingFareNaira: koboToNaira(initial.min_qualifying_fare_kobo),
    rewardMaxDiscountNaira:
      initial.reward_max_discount_kobo != null
        ? String(koboToNaira(initial.reward_max_discount_kobo))
        : "",
    rewardValidityDays:
      initial.reward_validity_days != null ? String(initial.reward_validity_days) : "",
  });

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveReferralProgram({
        isEnabled: v.isEnabled,
        referrerPercent: Number(v.referrerPercent),
        minQualifyingFareNaira: Number(v.minQualifyingFareNaira || 0),
        rewardMaxDiscountNaira:
          v.rewardMaxDiscountNaira.trim() === "" ? null : Number(v.rewardMaxDiscountNaira),
        rewardValidityDays:
          v.rewardValidityDays.trim() === "" ? null : Number(v.rewardValidityDays),
      });
      if (r.ok) {
        setMsg({ ok: true, text: "Saved." });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  }

  return (
    <div className="space-y-4">
      <label className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <span>
          <span className="text-foreground block text-sm font-medium">
            Referral program enabled
          </span>
          <span className="text-muted text-xs">
            When on, a referrer earns a discount once their friend completes their first paid
            booking.
          </span>
        </span>
        <input
          type="checkbox"
          checked={v.isEnabled}
          onChange={(e) => setV({ ...v, isEnabled: e.target.checked })}
          className="size-5 accent-[var(--color-primary)]"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Referrer reward (% off their next booking)
          <input
            className={fieldClass}
            type="number"
            min={1}
            max={100}
            value={v.referrerPercent}
            onChange={(e) => setV({ ...v, referrerPercent: Number(e.target.value) })}
          />
        </label>
        <label className={labelClass}>
          Min qualifying fare (₦, condition)
          <input
            className={fieldClass}
            type="number"
            min={0}
            value={v.minQualifyingFareNaira}
            onChange={(e) => setV({ ...v, minQualifyingFareNaira: Number(e.target.value) })}
          />
        </label>
        <label className={labelClass}>
          Max reward discount (₦, optional cap)
          <input
            className={fieldClass}
            type="number"
            min={0}
            placeholder="No cap"
            value={v.rewardMaxDiscountNaira}
            onChange={(e) => setV({ ...v, rewardMaxDiscountNaira: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Reward valid for (days, optional)
          <input
            className={fieldClass}
            type="number"
            min={1}
            placeholder="Never expires"
            value={v.rewardValidityDays}
            onChange={(e) => setV({ ...v, rewardValidityDays: e.target.value })}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save referral program"}
        </Button>
        {msg && (
          <span className={msg.ok ? "text-success text-sm" : "text-danger text-sm"}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
