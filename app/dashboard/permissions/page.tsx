import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { firstManageableVendorId } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin & permissions" };

const ROLE_LABEL: Record<string, string> = {
  vendor_owner: "Vendor Owner",
  vendor_manager: "Vendor Manager",
  booking_officer: "Booking Officer",
  terminal_staff: "Terminal Staff",
  luggage_officer: "Luggage Officer",
  finance_officer: "Finance Officer",
};

const ROLE_DESC: [string, string][] = [
  ["Vendor Owner", "Full control of the operator: fleet, routes, schedules, staff, finance."],
  ["Vendor Manager", "Manage fleet, routes, schedules and staff (not ownership transfer)."],
  ["Booking Officer", "Create and manage bookings; view manifests. No vehicle management."],
  ["Terminal Staff", "Check-in and board passengers; verify tickets; view assigned vehicle."],
  ["Luggage Officer", "Scan and track luggage; view manifests."],
  ["Finance Officer", "View financials and reports."],
];

export default async function PermissionsPage() {
  const ctx = await requireDashboardCapability("staff:manage");
  const vendorId = firstManageableVendorId(ctx);

  let staff: { user_id: string; full_name: string | null; email: string | null; role: string; is_active: boolean }[] = [];
  if (vendorId) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("vendor_staff_list", { p_vendor: vendorId });
    staff = (data ?? []) as typeof staff;
  }

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Access"
        title="Admin & permissions"
        subtitle="Who can do what in your operator."
      />

      {vendorId ? (
        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
            <Badge tone="neutral">{staff.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {staff.length === 0 ? (
              <p className="text-muted p-6 text-sm">No staff yet.</p>
            ) : (
              <div className="divide-border divide-y">
                {staff.map((s) => (
                  <div key={s.user_id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {s.full_name ?? "Team member"}
                      </p>
                      <p className="text-subtle truncate text-xs">{s.email ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!s.is_active && <Badge tone="danger">inactive</Badge>}
                      <Badge tone="primary">{ROLE_LABEL[s.role] ?? s.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="text-muted p-5 text-sm">
          You&apos;re a platform admin. Operator staff are managed by each operator&apos;s owner or
          manager.
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roles reference</CardTitle>
        </CardHeader>
        <CardContent className="divide-border divide-y p-0">
          {ROLE_DESC.map(([role, desc]) => (
            <div key={role} className="px-5 py-3">
              <p className="text-foreground text-sm font-medium">{role}</p>
              <p className="text-muted text-xs">{desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
