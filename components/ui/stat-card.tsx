import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChipTone = "primary" | "success" | "info" | "violet" | "teal" | "danger";

const chipClasses: Record<ChipTone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  teal: "bg-teal-soft text-teal",
  danger: "bg-danger-soft text-danger",
};

export interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: ChipTone;
  /** e.g. +24.5% (positive) or -4.5% (negative) */
  deltaPct?: number;
  footer?: string;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  deltaPct,
  footer,
}: StatCardProps) {
  const positive = (deltaPct ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn("flex size-7 items-center justify-center rounded-md", chipClasses[tone])}
          >
            {icon}
          </span>
          <span className="text-muted text-sm">{label}</span>
        </div>
        {deltaPct !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {positive ? "▲" : "▼"} {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      <p className="text-foreground mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {footer && <p className="text-subtle mt-2 text-xs">{footer}</p>}
    </Card>
  );
}
