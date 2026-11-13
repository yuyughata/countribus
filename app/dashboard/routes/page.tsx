import Link from "next/link";

import { ArrowRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { listRoutes } from "@/features/schedules/queries";

export const metadata = { title: "Route management" };

export default async function RoutesPage() {
  await requireDashboardCapability("route:manage");
  const routes = await listRoutes();

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Network"
        title="Route management"
        subtitle="The city-to-city routes your departures run on."
        action={
          <Link href="/dashboard/schedules">
            <Button className="gap-2">
              <Plus className="size-4" /> Add route
            </Button>
          </Link>
        }
      />

      {routes.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-foreground text-sm font-medium">No routes yet</p>
          <p className="text-muted mt-1 text-sm">
            Create your first route, then schedule departures on it.
          </p>
          <Link href="/dashboard/schedules" className="mt-4 inline-block">
            <Button variant="outline" size="sm" className="gap-1">
              Go to schedules <ArrowRight className="size-4" />
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="divide-border divide-y">
          {routes.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-semibold">{r.name}</p>
                <p className="text-muted truncate text-xs">
                  {r.origin?.name} → {r.destination?.name}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href="/dashboard/schedules"
                  className="text-primary text-xs font-medium"
                >
                  Schedule a departure
                </Link>
                <DeleteButton kind="route" id={r.id} name={r.name} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
