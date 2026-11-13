import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Activity log" };

export default async function ActivityPage() {
  await requireDashboardCapability("audit:view");

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("action, entity, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as {
    action: string;
    entity: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Audit"
        title="Activity log"
        subtitle="Sensitive actions across the platform, newest first."
      />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-muted p-6 text-sm">No activity recorded yet.</p>
          ) : (
            <ul className="divide-border divide-y">
              {rows.map((a, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-foreground text-sm">
                      <span className="font-medium">{a.action.replace(/[._]/g, " ")}</span>{" "}
                      <span className="text-subtle">· {a.entity}</span>
                    </p>
                    <p className="text-subtle text-xs">
                      {new Date(a.created_at).toLocaleString("en-NG")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
