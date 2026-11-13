"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { onboardVendorAction, type OnboardState } from "@/features/vendors/actions";

const fields = [
  { name: "name", label: "Operator name", placeholder: "e.g. Peace Mass Transit" },
  {
    name: "slug",
    label: "Portal address",
    placeholder: "peace-mass",
    hint: "Used for your branded booking page: /v/<slug>",
  },
  { name: "contactEmail", label: "Contact email (optional)", type: "email", required: false },
  { name: "contactPhone", label: "Contact phone", type: "tel", placeholder: "0803 000 0000" },
];

export function VendorOnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(
    onboardVendorAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="text-foreground text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            required={f.required !== false}
            className="border-border bg-surface text-foreground placeholder:text-subtle focus-visible:border-primary h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none"
          />
          {f.hint && <p className="text-subtle text-xs">{f.hint}</p>}
        </div>
      ))}

      {state?.error && (
        <p role="alert" className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
      <p className="text-subtle text-center text-xs">
        Your application is reviewed by the platform team before going live.
      </p>
    </form>
  );
}
