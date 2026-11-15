import { redirect } from "next/navigation";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/page-header";
import { ReconDatePicker } from "@/components/operations/recon-date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth/context";
import type { Role } from "@/lib/permissions/roles";
import { userHasCapability } from "@/lib/permissions/dashboard-nav";
import { formatKobo } from "@/lib/money";
import { getReconciliationData } from "@/features/reconciliation/queries";

export const metadata = { title: "Daily reconciliation" };

const FINANCE_ROLES: Role[] = ["vendor_owner", "finance_officer"];

function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-border bg-surface rounded-xl border p-4">
      <p className="text-subtle text-[11px] font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-foreground mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="text-subtle text-xs">{sub}</p>}
    </div>
  );
}

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?next=/dashboard/reconciliation");
  if (!userHasCapability(ctx, "finance:view")) redirect("/dashboard");

  const { date } = await searchParams;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : lagosToday();

  // Platform-wide for admins; otherwise the user's finance-scoped vendor.
  const vendorId = ctx.isPlatformAdmin
    ? null
    : (ctx.memberships.find((m) => FINANCE_ROLES.includes(m.role as Role))?.vendorId ?? null);

  const { summary, vehicles, unreconciled, staff } = await getReconciliationData(vendorId, day);

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DashboardHeader
          eyebrow="Finance"
          title="Daily reconciliation"
          subtitle={
            vendorId
              ? "Online vs walk-in sales, payments, loads and staff performance for the day."
              : "Platform-wide sales, revenue, commission and payment integrity for the day."
          }
        />
        <ReconDatePicker current={day} />
      </div>

      {/* Reconciliation status */}
      {summary.unreconciled === 0 ? (
        <div className="bg-success-soft text-success flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
          <CheckCircle2 className="size-4" /> Reconciled — every successful payment is matched to a
          paid booking.
        </div>
      ) : (
        <div className="bg-danger-soft text-danger flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
          <AlertTriangle className="size-4" /> {summary.unreconciled} unreconciled transaction
          {summary.unreconciled === 1 ? "" : "s"} need review.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Online"
          value={formatKobo(summary.online_revenue_kobo)}
          sub={`${summary.online_bookings} booking${summary.online_bookings === 1 ? "" : "s"}`}
        />
        <Stat
          label="Walk-in"
          value={formatKobo(summary.walkin_revenue_kobo)}
          sub={`${summary.walkin_bookings} booking${summary.walkin_bookings === 1 ? "" : "s"}`}
        />
        <Stat
          label="Total revenue"
          value={formatKobo(summary.total_revenue_kobo)}
          sub={`${summary.total_bookings} paid · ${summary.passengers} passengers`}
        />
        <Stat
          label={vendorId ? "Platform commission" : "Platform commission (income)"}
          value={formatKobo(summary.commission_kobo)}
          sub={vendorId ? `Operator net ${formatKobo(summary.vendor_net_kobo)}` : "across all operators"}
        />
      </div>

      {vendorId && (
        <Card>
          <CardHeader>
            <CardTitle>Passengers per vehicle</CardTitle>
            <Badge tone="neutral">{vehicles.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {vehicles.length === 0 ? (
              <p className="text-muted p-5 text-sm">No departures scheduled for this day.</p>
            ) : (
              <div className="divide-border divide-y">
                {vehicles.map((v) => (
                  <div key={v.vehicle_id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {v.registration_no}
                        {v.display_name ? ` · ${v.display_name}` : ""}
                      </p>
                      <p className="text-subtle text-xs">
                        {v.departures} departure{v.departures === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-foreground text-sm font-medium">
                      {v.passengers}
                      <span className="text-subtle"> / {v.capacity} seats</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {vendorId && (
        <Card>
          <CardHeader>
            <CardTitle>Staff sales &amp; incentives</CardTitle>
            <Badge tone="neutral">{staff.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {staff.length === 0 ? (
              <p className="text-muted p-5 text-sm">No staff sales recorded yet.</p>
            ) : (
              <div className="divide-border divide-y">
                {staff.map((s) => (
                  <div key={s.staff_id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-foreground text-sm font-semibold">{s.staff_name}</p>
                      <p className="text-subtle text-xs">
                        {s.sales_count} sale{s.sales_count === 1 ? "" : "s"} ·{" "}
                        {formatKobo(s.gross_sold_kobo)} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground text-sm font-medium">
                        {formatKobo(s.incentive_pending_kobo)}
                      </p>
                      <p className="text-subtle text-[11px]">
                        incentive outstanding · {formatKobo(s.incentive_paid_kobo)} paid
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <p className="text-subtle px-5 pb-3 text-[11px]">
            Staff figures are cumulative to date.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Unreconciled transactions</CardTitle>
          <Badge tone={unreconciled.length ? "danger" : "neutral"}>{unreconciled.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {unreconciled.length === 0 ? (
            <p className="text-muted p-5 text-sm">
              None — every successful payment this day is tied to a paid booking.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {unreconciled.map((u) => (
                <div key={u.reference} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-foreground text-sm font-semibold">{u.reference}</p>
                    <p className="text-subtle text-xs">
                      {u.provider} · payment {u.payment_status} · booking{" "}
                      {u.booking_status.replace("_", " ")}
                    </p>
                  </div>
                  <p className="text-foreground text-sm font-medium">{formatKobo(u.amount_kobo)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
