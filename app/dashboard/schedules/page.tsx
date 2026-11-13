import Link from "next/link";

import { Card } from "@/components/ui/card";
import { SchedulesConsole } from "@/components/schedules/schedules-console";
import { firstManageableVendorId, getAuthContext } from "@/lib/auth/context";
import {
  listManageableVehicleOptions,
  listRoutes,
  listSchedulesForConsole,
  listTerminalOptions,
} from "@/features/schedules/queries";

export const metadata = { title: "Schedules" };

export default async function SchedulesPage() {
  const ctx = await getAuthContext();
  const vendorId = ctx ? firstManageableVendorId(ctx) : null;

  const [terminals, routes, vehicles, schedules] = await Promise.all([
    listTerminalOptions(),
    listRoutes(),
    listManageableVehicleOptions(),
    listSchedulesForConsole(),
  ]);

  return (
    <div className="space-y-5 p-5">
      <div>
        <h2 className="text-foreground text-xl font-semibold">Routes & schedules</h2>
        <p className="text-muted text-sm">
          Create routes, schedule departures, assign vehicles and publish for sale. Publishing
          snapshots the seat layout and generates seat inventory.
        </p>
      </div>

      {vendorId ? (
        <SchedulesConsole
          vendorId={vendorId}
          terminals={terminals}
          vehicles={vehicles}
          routes={routes}
          schedules={schedules}
        />
      ) : (
        <Card className="text-muted p-6 text-sm">
          You need an approved vendor (as owner or manager) to manage schedules.{" "}
          <Link href="/dashboard/vendors/new" className="text-primary font-medium">
            Onboard an operator
          </Link>
          .
        </Card>
      )}
    </div>
  );
}
