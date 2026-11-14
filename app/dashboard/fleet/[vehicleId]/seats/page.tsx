import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SeatLayoutEditor } from "@/components/fleet/seat-layout-editor";
import { canForVendor, getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { listSeatTemplates } from "@/features/fleet/queries";

export const metadata = { title: "Seat layout" };

export default async function SeatLayoutPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, vendor_id, registration_no, display_name")
    .eq("id", vehicleId)
    .maybeSingle();
  if (!vehicle) notFound();
  if (!canForVendor(ctx, vehicle.vendor_id, "vehicle:manage")) redirect("/dashboard/fleet");

  const templates = await listSeatTemplates(vehicleId);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-5">
      <Link
        href="/dashboard/fleet"
        className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to fleet
      </Link>
      <div>
        <span className="inline-flex items-center gap-3">
          <span className="rule-gold" />
          <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
            Seat layout
          </span>
        </span>
        <h1 className="font-display text-foreground mt-1.5 text-2xl font-semibold tracking-tight">
          {vehicle.display_name || vehicle.registration_no}
        </h1>
        <p className="text-muted mt-1 text-sm">
          Design the physical seat map. Published layouts are frozen — create a new version to
          change them.
        </p>
      </div>

      {templates.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-foreground text-sm font-medium">Existing versions</p>
            {templates.map((t) => (
              <div key={t.id} className="text-muted flex justify-between text-sm">
                <span>
                  {t.name} · v{t.version} · {t.rows}×{t.columns}
                </span>
                <span>{t.is_published ? "published" : "draft"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <SeatLayoutEditor
            vendorId={vehicle.vendor_id}
            vehicleId={vehicle.id}
            vehicleName={vehicle.display_name || vehicle.registration_no}
          />
        </CardContent>
      </Card>
    </div>
  );
}
