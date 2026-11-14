import { IntegrationsForm } from "@/components/dashboard/comms/integrations-form";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { getCommSettingsStatus } from "@/features/communications/queries";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  await requireDashboardCapability("platform:manage");
  const status = await getCommSettingsStatus();
  return <IntegrationsForm status={status} />;
}
