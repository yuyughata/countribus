"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import type { ActionResult } from "@/features/auth/actions";

type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
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
  const [shown, setShown] = useState<Record<string, boolean>>({});

  return (
    <form action={formAction} className="space-y-4">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => {
        const isPassword = f.type === "password";
        const reveal = isPassword && shown[f.name];
        return (
          <div key={f.name} className="space-y-1.5">
            <label htmlFor={f.name} className="text-foreground text-sm font-medium">
              {f.label}
            </label>
            <div className="relative">
              <input
                id={f.name}
                name={f.name}
                type={isPassword ? (reveal ? "text" : "password") : (f.type ?? "text")}
                autoComplete={f.autoComplete}
                placeholder={f.placeholder}
                defaultValue={f.defaultValue}
                required={f.required !== false}
                className={`${fieldClass}${isPassword ? " pr-11" : ""}`}
              />
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShown((s) => ({ ...s, [f.name]: !s[f.name] }))}
                  aria-label={reveal ? "Hide password" : "Show password"}
                  aria-pressed={!!reveal}
                  className="text-subtle hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
                  tabIndex={-1}
                >
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              )}
            </div>
            {f.hint && <p className="text-subtle text-xs">{f.hint}</p>}
          </div>
        );
      })}

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
