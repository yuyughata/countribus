import Link from "next/link";

import { Bus, CheckCircle2, ClipboardCheck, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { formatKobo } from "@/lib/money";
import { dashboardMode, getAdminDashboard, getVendorDashboard } from "@/features/dashboard/queries";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const mode = dashboardMode(ctx);

  if (mode.mode === "vendor") {
    const m = await getVendorDashboard(mode.vendorId);
    return (
      <div className="space-y-5 p-5">
        <DashboardHeader eyebrow="Overview" title="Welcome back 👋" subtitle="Your operator performance." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Gross bookings" value={formatKobo(m?.gross_booking_kobo ?? 0)} icon={<Wallet className="size-4" />} tone="primary" />
          <StatCard label="Net revenue" value={formatKobo(m?.net_kobo ?? 0)} icon={<Wallet className="size-4" />} tone="success" />
          <StatCard label="Paid bookings" value={String(m?.bookings_paid ?? 0)} icon={<ClipboardCheck className="size-4" />} tone="info" />
          <StatCard label="Upcoming trips" value={String(m?.upcoming_trips ?? 0)} icon={<Bus className="size-4" />} tone="violet" />
          <StatCard label="Active vehicles" value={String(m?.vehicles ?? 0)} icon={<Bus className="size-4" />} tone="teal" />
        </div>
        <Card className="p-5 text-sm text-muted">
          Manage your <Link href="/dashboard/fleet" className="font-medium text-primary">fleet</Link>,{" "}
          <Link href="/dashboard/schedules" className="font-medium text-primary">schedules</Link> and{" "}
          <Link href="/dashboard/manifests" className="font-medium text-primary">departures</Link>.
        </Card>
      </div>
    );
  }

  if (mode.mode === "none") {
    return (
      <div className="space-y-5 p-5">
        <DashboardHeader eyebrow="Overview" title="Welcome 👋" />
        <Card className="p-6 text-sm text-muted">
          You don&apos;t manage an operator yet.{" "}
          <Link href="/dashboard/vendors/new" className="font-medium text-primary">Onboard your transport business</Link> to get started.
        </Card>
      </div>
    );
  }

  const { metrics, revenue, pending, activity } = await getAdminDashboard();
  const maxBar = Math.max(1, ...revenue.map((r) => r.gross_kobo));

  return (
    <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <DashboardHeader eyebrow="Overview" title="Welcome back 👋" subtitle="Platform activity overview." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Gross booking value" value={formatKobo(metrics?.gross_booking_kobo ?? 0)} icon={<Wallet className="size-4" />} tone="primary" />
          <StatCard label="Platform commission" value={formatKobo(metrics?.commission_kobo ?? 0)} icon={<Wallet className="size-4" />} tone="success" />
          <StatCard label="Active trips" value={String(metrics?.active_trips ?? 0)} icon={<Bus className="size-4" />} tone="info" />
          <StatCard label="Paid bookings" value={String(metrics?.bookings_paid ?? 0)} icon={<ClipboardCheck className="size-4" />} tone="violet" />
          <StatCard label="Approved vendors" value={String(metrics?.vendors ?? 0)} icon={<Users className="size-4" />} tone="teal" />
          <StatCard label="Passengers" value={String(metrics?.passengers ?? 0)} icon={<Users className="size-4" />} tone="primary" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <Badge tone="neutral">Last 12 months</Badge>
          </CardHeader>
          <CardContent>
            {revenue.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No revenue recorded yet.</p>
            ) : (
              <div className="flex h-44 gap-2">
                {revenue.map((r, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className="w-full rounded-t"
                      style={{ height: `${(r.gross_kobo / maxBar) * 90}%`, backgroundColor: "var(--color-chart-bar)" }}
                      title={`${r.month}: ${formatKobo(r.gross_kobo)}`}
                    />
                    <span className="text-[10px] text-subtle">{r.month}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending approvals <Badge tone="primary">{pending.length}</Badge>
            </CardTitle>
            <Link href="/dashboard/vendors" className="text-xs font-medium text-primary">See all</Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted">No pending applications.</p>
            ) : (
              pending.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{v.name}</p>
                  <Link href="/dashboard/vendors">
                    <Button size="sm" className="shrink-0">Review</Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted">No recent activity.</p>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-info" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{a.action.replace(/[._]/g, " ")}</p>
                    <p className="text-xs text-subtle">{new Date(a.created_at).toLocaleString("en-NG")}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
