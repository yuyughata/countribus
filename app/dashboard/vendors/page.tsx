import Link from "next/link";

import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VendorDecisionButtons } from "@/components/vendors/vendor-decision-buttons";
import { getAuthContext } from "@/lib/auth/context";
import { listVisibleVendors } from "@/features/vendors/queries";
import type { VendorStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Vendors" };

const statusTone: Record<VendorStatus, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  suspended: "danger",
  rejected: "neutral",
};

export default async function VendorsPage() {
  const ctx = await getAuthContext();
  const isAdmin = ctx?.isPlatformAdmin ?? false;
  const vendors = await listVisibleVendors();

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-xl font-semibold">Vendor management</h2>
          <p className="text-muted text-sm">
            {isAdmin
              ? "Review applications and manage operators across the platform."
              : "Your transport operator profile and status."}
          </p>
        </div>
        <Link href="/dashboard/vendors/new">
          <Button className="gap-2">
            <Plus className="size-4" /> New operator
          </Button>
        </Link>
      </div>

      {vendors.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-foreground text-sm font-medium">No vendors yet</p>
          <p className="text-muted mt-1 text-sm">
            {isAdmin
              ? "Applications will appear here as operators apply."
              : "Apply to list your transport business on Countribus."}
          </p>
          <Link href="/dashboard/vendors/new" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Start an application
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="divide-border divide-y">
          {vendors.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-foreground truncate text-sm font-semibold">{v.name}</p>
                  <Badge tone={statusTone[v.status]}>{v.status}</Badge>
                </div>
                <p className="text-muted truncate text-xs">
                  /v/{v.slug}
                  {v.contact_phone ? ` · ${v.contact_phone}` : ""}
                  {v.contact_email ? ` · ${v.contact_email}` : ""}
                </p>
              </div>
              {isAdmin && <VendorDecisionButtons vendorId={v.id} status={v.status} />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
