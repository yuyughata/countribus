import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { AgreementSigner } from "@/components/dashboard/agreements/agreement-signer";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { firstManageableVendorId } from "@/lib/auth/context";
import { getVendorAgreementState } from "@/features/agreements/vendor-queries";

export const metadata = { title: "Partner agreement" };

export default async function VendorAgreementPage() {
  const ctx = await requireDashboardCapability("vendor:manage_own");

  // Platform admins don't sign — they author the clauses every operator signs.
  // Send them to the Agreements editor (add/edit/delete clauses + countersign).
  if (ctx.isPlatformAdmin) redirect("/dashboard/agreements/partner");

  const vendorId = firstManageableVendorId(ctx);

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Legal"
        title="Partner agreement"
        subtitle="Review and sign your agreement with Countribus."
      />
      {!vendorId ? (
        <Card className="text-muted p-6 text-sm">
          The Partner Agreement is signed by your operator&apos;s owner or a manager.
        </Card>
      ) : (
        <AgreementSigner state={await getVendorAgreementState(vendorId)} />
      )}
    </div>
  );
}
