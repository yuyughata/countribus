import type * as React from "react";
import { redirect } from "next/navigation";

import { AgreementBanner } from "@/components/dashboard/agreement-banner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { firstManageableVendorId, getAuthContext } from "@/lib/auth/context";
import { allowedDashboardHrefs } from "@/lib/permissions/dashboard-nav";
import { getVendorAgreementState } from "@/features/agreements/vendor-queries";
import { getInAppFeed } from "@/features/notifications/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const allowed = allowedDashboardHrefs(ctx);

  // Operator-facing extras: in-app notification feed + unsigned-agreement banner.
  const vendorId = firstManageableVendorId(ctx);
  const [feed, agreement] = await Promise.all([
    getInAppFeed(),
    vendorId ? getVendorAgreementState(vendorId) : Promise.resolve(null),
  ]);
  const needsSignature = !!agreement?.current && agreement.outstanding;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar allowed={allowed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title="Dashboard"
          email={ctx.email}
          allowed={allowed}
          notifications={feed.items}
          unread={feed.unread}
        />
        {needsSignature && <AgreementBanner version={agreement!.current!.version} />}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
