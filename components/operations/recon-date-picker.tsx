"use client";

import { useRouter } from "next/navigation";

import { fieldClass as field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Date control that reloads the reconciliation report for the chosen day. */
export function ReconDatePicker({ current }: { current: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      aria-label="Reconciliation date"
      className={cn(field, "w-auto")}
      value={current}
      onChange={(e) => {
        if (e.target.value) router.push(`/dashboard/reconciliation?date=${e.target.value}`);
      }}
    />
  );
}
