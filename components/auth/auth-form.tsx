"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/features/auth/actions";

type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  fields: Field[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

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
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            required
            className="border-border bg-surface text-foreground placeholder:text-subtle focus-visible:border-primary h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none"
          />
        </div>
      ))}

      {state && !state.ok && (
        <p role="alert" className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </Button>
    </form>
  );
}
