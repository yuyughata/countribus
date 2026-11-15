import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/page-header";
import { WalkinBooking } from "@/components/operations/walkin-booking";
import { getAuthContext } from "@/lib/auth/context";
import { userHasCapability } from "@/lib/permissions/dashboard-nav";
import { listWalkinSchedules } from "@/features/walkin/queries";

export const metadata = { title: "Walk-in booking" };

export default async function WalkInPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/dashboard/walk-in");
  // Counter sales are for the vendor's sales staff (and platform admin) only.
  if (!userHasCapability(ctx, "booking:counter")) redirect("/dashboard");

  const schedules = await listWalkinSchedules();

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Counter"
        title="Walk-in booking"
        subtitle="Sell a seat at the terminal, take payment, and issue the e-ticket. Walk-in sales draw on the same seat inventory as online bookings."
      />
      <WalkinBooking schedules={schedules} />
    </div>
  );
}
