"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/communications/emails", label: "Emails" },
  { href: "/dashboard/communications/templates", label: "Templates" },
  { href: "/dashboard/communications/integrations", label: "Integrations" },
];

export function CommTabs() {
  const pathname = usePathname();
  return (
    <div className="border-border flex gap-1 border-b">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
