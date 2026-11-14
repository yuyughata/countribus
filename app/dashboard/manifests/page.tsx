import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { listDepartures } from "@/features/ops/queries";

export const metadata = { title: "Departures" };

export default async function ManifestsPage() {
  const departures = await listDepartures();

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Terminal"
        title="Departures & manifests"
        subtitle="Open a departure to view its passenger and luggage manifest and board passengers."
      />

      {departures.length === 0 ? (
        <Card className="text-muted p-8 text-center text-sm">No published departures.</Card>
      ) : (
        <Card className="divide-border divide-y">
          {departures.map((d) => (
            <Link
              key={d.id}
              href={`/dashboard/manifests/${d.id}`}
              className="hover:bg-surface-muted flex items-center justify-between p-4"
            >
              <div>
                <p className="text-foreground text-sm font-semibold">
                  {d.routes?.name ?? `${d.origin?.name} → ${d.destination?.name}`}
                </p>
                <p className="text-muted text-xs">
                  {new Date(d.departure_at).toLocaleString("en-NG")}
                </p>
              </div>
              <Badge tone={d.status === "published" ? "success" : "neutral"}>{d.status}</Badge>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
