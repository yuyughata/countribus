"use client";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className="text-muted block space-y-1 text-xs font-medium">
      {label}
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, "h-auto py-2", className)}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, className)}
        />
      )}
    </label>
  );
}

export function SaveRow({
  pending,
  msg,
  onSave,
}: {
  pending: boolean;
  msg: { ok: boolean; text: string } | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button type="button" size="sm" onClick={onSave} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {msg && <span className={cn("text-sm", msg.ok ? "text-success" : "text-danger")}>{msg.text}</span>}
    </div>
  );
}
