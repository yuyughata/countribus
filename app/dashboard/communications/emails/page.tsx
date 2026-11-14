import Link from "next/link";

import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailComposer } from "@/components/dashboard/comms/email-composer";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { getCampaign, listCampaigns } from "@/features/email-campaigns/queries";

export const metadata = { title: "Emails" };

const STATUS_TONE: Record<string, "neutral" | "success" | "info" | "danger"> = {
  draft: "neutral",
  sending: "info",
  sent: "success",
  failed: "danger",
};

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requireDashboardCapability("platform:manage");
  const { id } = await searchParams;
  const [campaigns, campaign] = await Promise.all([
    listCampaigns(12),
    id ? getCampaign(id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      {/* Recent emails strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/communications/emails">
          <Button size="sm" variant={id ? "outline" : "primary"} className="gap-1.5">
            <Plus className="size-4" /> New email
          </Button>
        </Link>
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/communications/emails?id=${c.id}`}
            className={`border-border hover:bg-surface-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
              c.id === id ? "bg-surface-muted" : "bg-surface"
            }`}
          >
            <span className="text-foreground max-w-[180px] truncate font-medium">
              {c.subject || "Untitled"}
            </span>
            <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Badge>
          </Link>
        ))}
      </div>

      <EmailComposer campaign={campaign} />
    </div>
  );
}
