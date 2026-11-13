import { cn } from "@/lib/utils";

/**
 * Countribus brand mark + wordmark.
 *
 * The mark is a stylised route node — a rounded badge with a pin/road motif —
 * rendered in brand gold on ink. Use `tone="light"` on dark backgrounds.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--color-brand-ink)" />
      <path
        d="M16 6.5c-3.6 0-6.5 2.8-6.5 6.3 0 4.3 5.3 9.9 6 10.6a.7.7 0 0 0 1 0c.7-.7 6-6.3 6-10.6 0-3.5-2.9-6.3-6.5-6.3Z"
        fill="var(--color-accent)"
      />
      <circle cx="16" cy="12.8" r="2.4" fill="var(--color-brand-ink)" />
    </svg>
  );
}

export function Logo({
  tone = "ink",
  className,
  markClassName,
}: {
  tone?: "ink" | "light";
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("size-7", markClassName)} />
      <span
        className={cn(
          "font-display text-[1.35rem] font-semibold tracking-tight",
          tone === "light" ? "text-white" : "text-brand-ink",
        )}
      >
        countri<span className="text-accent">bus</span>
      </span>
    </span>
  );
}

/** Small "Powered by Countribus" lockup for tickets, footers, emails. */
export function PoweredBy({
  tone = "ink",
  className,
}: {
  tone?: "ink" | "light";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        tone === "light" ? "text-white/70" : "text-muted",
        className,
      )}
    >
      Powered by
      <LogoMark className="size-4" />
      <span className={cn("font-display font-semibold", tone === "light" ? "text-white" : "text-brand-ink")}>
        countri<span className="text-accent">bus</span>
      </span>
    </span>
  );
}
