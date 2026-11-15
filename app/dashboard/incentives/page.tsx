import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/page-header";
import { IncentivesManager } from "@/components/operations/incentives-manager";
import { firstManageableVendorId } from "@/lib/auth/access";
import { getAuthContext } from "@/lib/auth/context";
import { userHasCapability } from "@/lib/permissions/dashboard-nav";
import { getIncentivesData } from "@/features/incentives/queries";

export const metadata = { title: "Staff incentives" };

export default async function IncentivesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/dashboard/incentives");
  if (!userHasCapability(ctx, "incentive:manage")) redirect("/dashboard");

  const vendorId = firstManageableVendorId(ctx);

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Sales"
        title="Staff incentives"
        subtitle="Set fixed or percentage sales incentives, track each staff member's sales and balances, and record payouts."
      />
      {vendorId ? (
        <IncentivesManager vendorId={vendorId} data={await getIncentivesData(vendorId)} />
      ) : (
        <p className="text-muted text-sm">
          Staff incentives are configured from an operator owner account. Sign in as a vendor
          owner to manage incentives for that operator.
        </p>
      )}
    </div>
  );
}
