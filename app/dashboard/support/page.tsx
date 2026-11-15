import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/page-header";
import { TicketWorkspace } from "@/components/support/ticket-workspace";
import { getAuthContext } from "@/lib/auth/context";
import {
  listAllTickets,
  listMyTickets,
  listVendorHealth,
  namesByUserId,
} from "@/features/support/queries";

export const metadata = { title: "Support" };

export default async function DashboardSupportPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  if (ctx.isPlatformAdmin) {
    const [tickets, flagged] = await Promise.all([listAllTickets(), listVendorHealth()]);
    const names = await namesByUserId(tickets.map((t) => t.created_by ?? ""));
    return (
      <div className="space-y-5 p-5">
        <DashboardHeader
          eyebrow="Support"
          title="Support tickets"
          subtitle="Requests from customers and operators, plus flagged operators."
        />
        <TicketWorkspace mode="admin" tickets={tickets} creatorNames={names} flagged={flagged} />
      </div>
    );
  }

  const tickets = await listMyTickets();
  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Support"
        title="Platform support"
        subtitle="Raise technical or platform issues with the Countribus team and track responses."
      />
      <TicketWorkspace mode="operator" tickets={tickets} />
    </div>
  );
}
