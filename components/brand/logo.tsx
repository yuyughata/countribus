import { cn } from "@/lib/utils";

/**
 * Countribus wordmark — bold sans, "countri" in ink / "bus" in wine. No icon.
 * `tone="light"` is for dark surfaces (the hero/footer): the first part turns
 * white and "bus" uses a lighter wine so it stays legible on deep wine.
 */
export function Logo({
  tone = "ink",
  className,
}: {
  tone?: "ink" | "light";
  className?: string;
  /** @deprecated kept for call-site compatibility; the icon was removed. */
  markClassName?: string;
}) {
  const light = tone === "light";
  return (
    <span
      className={cn(
        "font-sans text-[1.35rem] leading-none font-extrabold tracking-tight",
        light ? "text-white" : "text-foreground",
        className,
      )}
    >
      countri<span className={light ? "text-[#e39bac]" : "text-primary"}>bus</span>
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
  const light = tone === "light";
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 text-xs",
        light ? "text-white/70" : "text-muted",
        className,
      )}
    >
      Powered by
      <span className={cn("font-sans text-sm font-extrabold tracking-tight", light ? "text-white" : "text-foreground")}>
        countri<span className={light ? "text-[#e39bac]" : "text-primary"}>bus</span>
      </span>
    </span>
  );
}
