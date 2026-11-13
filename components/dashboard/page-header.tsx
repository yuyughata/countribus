import type * as React from "react";

/** Consistent dashboard page heading: gold eyebrow + title + optional subtitle. */
export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="inline-flex items-center gap-3">
          <span className="rule-gold" />
          <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
            {eyebrow}
          </span>
        </span>
        <h1 className="font-display text-foreground mt-1.5 text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
