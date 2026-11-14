import { DashboardHeader } from "@/components/dashboard/page-header";
import { AgreementTabs } from "@/components/dashboard/agreements/agreement-tabs";
import { requireDashboardCapability } from "@/lib/auth/guard";

export default async function AgreementsLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardCapability("platform:manage");
  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Legal"
        title="Agreements"
        subtitle="The Partner Agreement operators sign, and the Boarding Policy customers accept."
      />
      <AgreementTabs />
      {children}
    </div>
  );
}
