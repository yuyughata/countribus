import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { TeamManager } from "@/components/dashboard/team-manager";
import { IncentivesManager } from "@/components/operations/incentives-manager";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { canForVendor } from "@/lib/auth/access";
import { firstManageableVendorId, roleForVendor } from "@/lib/auth/context";
import { listPendingInvites, listTeam } from "@/features/team/queries";
import { getIncentivesData } from "@/features/incentives/queries";

export const metadata = { title: "Team management" };

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

  // Sales incentives live on this page too, but only for those who may manage
  // them (vendor owner / platform admin) — a manager sees roles & invites only.
  const showIncentives = Boolean(vendorId) && canForVendor(ctx, vendorId!, "incentive:manage");
  const incentives = showIncentives ? await getIncentivesData(vendorId!) : null;

  return (
    <div className="space-y-6 p-5">
      <DashboardHeader
        eyebrow="Team"
        title="Team management"
        subtitle="Assign roles, invite team members, and set sales incentives for your operator."
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

      {incentives && (
        <section className="space-y-3">
          <div>
            <h2 className="text-foreground text-base font-semibold">Sales incentives</h2>
            <p className="text-muted text-sm">
              Configure fixed or percentage incentives and record payouts for your sales staff.
            </p>
          </div>
          <IncentivesManager vendorId={vendorId!} data={incentives} />
        </section>
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
