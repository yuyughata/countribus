import { KeyRound, Lock, ScrollText, ShieldCheck, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { requireDashboardCapability } from "@/lib/auth/guard";

export const metadata = { title: "Security & compliance" };

const CONTROLS: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Row Level Security on every tenant table",
    body: "Operators can only ever read and write their own data. Cross-vendor access is blocked in the database, not just the UI, and is covered by automated tests.",
  },
  {
    icon: Lock,
    title: "Server-side authorization",
    body: "Every sensitive action is checked on the server against the role matrix. Hiding a menu item is never the only guard.",
  },
  {
    icon: Wallet,
    title: "Verified payments only",
    body: "A booking is confirmed solely from a signed provider webhook with an independent amount re-check. The financial ledger is append-only.",
  },
  {
    icon: KeyRound,
    title: "Secrets kept server-side",
    body: "Service keys and payment/messaging credentials live in server environment only — never in the browser bundle or the repository.",
  },
  {
    icon: ScrollText,
    title: "Audited sensitive actions",
    body: "Approvals, role changes and other sensitive events are written to the audit log, visible under Activity log.",
  },
];

export default async function SecurityPage() {
  await requireDashboardCapability("platform:manage");

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Trust"
        title="Security & compliance"
        subtitle="How Countribus protects operators and passengers."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {CONTROLS.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <span className="bg-accent-soft text-accent-strong ring-accent/20 flex size-10 items-center justify-center rounded-xl ring-1">
              <Icon className="size-5" />
            </span>
            <h3 className="text-foreground mt-3 text-sm font-semibold">{title}</h3>
            <p className="text-muted mt-1 text-sm leading-relaxed">{body}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="text-muted text-sm">
          Pre-launch hardening items (production payment keys, leaked-password protection,
          backup/restore drill and independent provider re-verification) are tracked in the launch
          runbook. See <span className="text-foreground font-medium">docs/SECURITY_REVIEW.md</span>{" "}
          and <span className="text-foreground font-medium">docs/RUNBOOK.md</span>.
        </CardContent>
      </Card>
    </div>
  );
}
