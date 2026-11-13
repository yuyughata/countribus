import Link from "next/link";

import { Bus, LayoutGrid } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddVehicleForm } from "@/components/fleet/add-vehicle-form";
import { getAuthContext, firstManageableVendorId } from "@/lib/auth/context";
import { listCategories, listVehicles } from "@/features/fleet/queries";

export const metadata = { title: "Fleet" };

const statusTone = { active: "success", inactive: "neutral", maintenance: "warning" } as const;

export default async function FleetPage() {
  const ctx = await getAuthContext();
  const vendorId = ctx ? firstManageableVendorId(ctx) : null;
  const [vehicles, categories] = await Promise.all([listVehicles(), listCategories()]);

  return (
    <div className="space-y-5 p-5">
      <div>
        <h2 className="text-foreground text-xl font-semibold">Fleet</h2>
        <p className="text-muted text-sm">
          Vehicles and seat layouts. Managed by vendor owners/managers and platform admins only.
        </p>
      </div>

      {vendorId ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <AddVehicleForm
              vendorId={vendorId}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="text-muted p-6 text-sm">
          You need an approved vendor (as owner or manager) to add vehicles.{" "}
          <Link href="/dashboard/vendors/new" className="text-primary font-medium">
            Onboard an operator
          </Link>
          .
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vehicles ({vehicles.length})</CardTitle>
        </CardHeader>
        {vehicles.length === 0 ? (
          <CardContent className="text-muted text-sm">No vehicles yet.</CardContent>
        ) : (
          <div className="divide-border divide-y">
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="bg-primary-soft text-primary flex size-9 items-center justify-center rounded-md">
                    <Bus className="size-4" />
                  </span>
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      {v.display_name || v.registration_no}
                    </p>
                    <p className="text-muted text-xs">
                      {v.registration_no} · {v.vehicle_categories?.name ?? "—"} · {v.capacity} seats
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone[v.status]}>{v.status}</Badge>
                  <Link
                    href={`/dashboard/fleet/${v.id}/seats`}
                    className="text-primary inline-flex items-center gap-1 text-sm font-medium"
                  >
                    <LayoutGrid className="size-4" /> Seat layout
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
