import { Bus, ClipboardCheck, Users, Wallet } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { formatKobo } from "@/lib/money";
import {
  dashboardMode,
  getAdminDashboard,
  getVendorDashboard,
} from "@/features/dashboard/queries";

export const metadata = { title: "Analytics & reporting" };

export default async function ReportsPage() {
  const ctx = await requireDashboardCapability("finance:view");
  const mode = dashboardMode(ctx);

  if (mode.mode === "vendor") {
    const m = await getVendorDashboard(mode.vendorId);
    return (
      <div className="space-y-5 p-5">
        <DashboardHeader eyebrow="Insights" title="Analytics & reporting" subtitle="Your operator performance." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Gross bookings" value={formatKobo(m?.gross_booking_kobo ?? 0)} tone="primary" icon={<Wallet className="size-4" />} />
          <StatCard label="Net revenue" value={formatKobo(m?.net_kobo ?? 0)} tone="success" icon={<Wallet className="size-4" />} />
          <StatCard label="Paid bookings" value={String(m?.bookings_paid ?? 0)} tone="info" icon={<ClipboardCheck className="size-4" />} />
          <StatCard label="Upcoming trips" value={String(m?.upcoming_trips ?? 0)} tone="violet" icon={<Bus className="size-4" />} />
        </div>
      </div>
    );
  }

  const { metrics, revenue } = await getAdminDashboard();
  const maxBar = Math.max(1, ...revenue.map((r) => r.gross_kobo));

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader eyebrow="Insights" title="Analytics & reporting" subtitle="Platform performance across all operators." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Gross booking value" value={formatKobo(metrics?.gross_booking_kobo ?? 0)} tone="primary" icon={<Wallet className="size-4" />} />
        <StatCard label="Platform commission" value={formatKobo(metrics?.commission_kobo ?? 0)} tone="success" icon={<Wallet className="size-4" />} />
        <StatCard label="Paid bookings" value={String(metrics?.bookings_paid ?? 0)} tone="info" icon={<ClipboardCheck className="size-4" />} />
        <StatCard label="Active trips" value={String(metrics?.active_trips ?? 0)} tone="violet" icon={<Bus className="size-4" />} />
        <StatCard label="Approved vendors" value={String(metrics?.vendors ?? 0)} tone="teal" icon={<Users className="size-4" />} />
        <StatCard label="Passengers" value={String(metrics?.passengers ?? 0)} tone="primary" icon={<Users className="size-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
          <Badge tone="neutral">Last 12 months</Badge>
        </CardHeader>
        <CardContent>
          {revenue.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">No revenue recorded yet.</p>
          ) : (
            <div className="flex h-44 gap-2">
              {revenue.map((r, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${(r.gross_kobo / maxBar) * 90}%`, backgroundColor: "var(--color-chart-bar)" }}
                    title={`${r.month}: ${formatKobo(r.gross_kobo)}`}
                  />
                  <span className="text-subtle text-[10px]">{r.month}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
