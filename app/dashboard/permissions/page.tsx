import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { TeamManager } from "@/components/dashboard/team-manager";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { firstManageableVendorId, roleForVendor } from "@/lib/auth/context";
import { listPendingInvites, listTeam } from "@/features/team/queries";

export const metadata = { title: "Admin & permissions" };

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

  const [staff, invites] = vendorId
    ? await Promise.all([listTeam(vendorId), listPendingInvites(vendorId)])
    : [[], []];
  const canAssignOwner =
    ctx.isPlatformAdmin || roleForVendor(ctx, vendorId ?? "") === "vendor_owner";

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Access"
        title="Admin & permissions"
        subtitle="Who can do what in your operator. Assign roles and invite team members."
      />

      {vendorId ? (
        <TeamManager
          vendorId={vendorId}
          staff={staff}
          invites={invites}
          canAssignOwner={canAssignOwner}
        />
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
