import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[var(--shadow-wine)] hover:brightness-110 active:brightness-95",
  secondary: "bg-brand-ink text-white hover:brightness-150 active:brightness-125",
  accent:
    "bg-accent text-brand-ink shadow-[var(--shadow-gold)] hover:brightness-[1.04] active:brightness-95",
  outline: "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
  ghost: "text-foreground hover:bg-surface-muted",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[0.95rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "focus-visible:outline-primary inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-[filter,background-color,box-shadow,transform] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
