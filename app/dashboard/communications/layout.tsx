import { DashboardHeader } from "@/components/dashboard/page-header";
import { CommTabs } from "@/components/dashboard/comms/comm-tabs";
import { requireDashboardCapability } from "@/lib/auth/guard";

export default async function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardCapability("platform:manage");
  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Communications"
        title="Communications"
        subtitle="Email campaigns, notification templates and provider integrations."
      />
      <CommTabs />
      {children}
    </div>
  );
}
