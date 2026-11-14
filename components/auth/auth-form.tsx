"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
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
  hidden,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
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
            className={fieldClass}
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
