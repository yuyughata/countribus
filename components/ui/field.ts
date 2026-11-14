/**
 * Shared form-control styles so every input/select/textarea across the app has
 * the same feel: rounded, hairline border, wine focus ring. Import these rather
 * than redefining per form.
 */
export const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15";

/** Wrapping label (label text on top, control inside). */
export const labelClass = "text-muted space-y-1 text-xs font-medium";
