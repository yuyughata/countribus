import { TemplatesBrowser } from "@/components/dashboard/comms/templates-browser";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { TEMPLATE_CATALOG } from "@/lib/notifications/catalog";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  await requireDashboardCapability("platform:manage");
  return <TemplatesBrowser templates={TEMPLATE_CATALOG} />;
}
