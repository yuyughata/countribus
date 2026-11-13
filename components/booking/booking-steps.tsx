import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = ["Select seats", "Passenger details", "Payment"] as const;

/** Compact progress rail for the booking funnel. `current` is 1-based. */
export function BookingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:gap-3">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                done && "bg-success border-success text-white",
                active && "bg-brand-ink border-brand-ink text-white",
                !done && !active && "border-border text-subtle",
              )}
            >
              {done ? <Check className="size-3.5" /> : step}
            </span>
            <span
              className={cn(
                "font-medium",
                active ? "text-foreground" : "text-subtle",
                "hidden sm:inline",
              )}
            >
              {label}
            </span>
            {step < STEPS.length && <span className="bg-border h-px w-5 sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
