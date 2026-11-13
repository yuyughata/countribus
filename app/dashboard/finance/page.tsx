import { Wallet } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/page-header";
import { requireDashboardCapability } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/money";
import {
  dashboardMode,
  getAdminDashboard,
  getVendorDashboard,
} from "@/features/dashboard/queries";

export const metadata = { title: "Financials" };

const ENTRY_LABEL: Record<string, string> = {
  booking_gross: "Booking (gross)",
  platform_commission: "Platform commission",
  vendor_net: "Vendor net",
  provider_fee: "Provider fee",
  refund: "Refund",
  reversal: "Reversal",
  adjustment: "Adjustment",
};

export default async function FinancePage() {
  const ctx = await requireDashboardCapability("finance:view");
  const mode = dashboardMode(ctx);

  let gross = 0;
  let commission = 0;
  let net = 0;
  if (mode.mode === "admin") {
    const { metrics } = await getAdminDashboard();
    gross = metrics?.gross_booking_kobo ?? 0;
    commission = metrics?.commission_kobo ?? 0;
    net = gross - commission;
  } else if (mode.mode === "vendor") {
    const m = await getVendorDashboard(mode.vendorId);
    gross = m?.gross_booking_kobo ?? 0;
    net = m?.net_kobo ?? 0;
    commission = gross - net;
  }

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("financial_ledger")
    .select("entry_type, amount_kobo, created_at, bookings(reference)")
    .order("created_at", { ascending: false })
    .limit(25);
  const rows = (entries ?? []) as unknown as {
    entry_type: string;
    amount_kobo: number;
    created_at: string;
    bookings: { reference: string } | null;
  }[];

  return (
    <div className="space-y-5 p-5">
      <DashboardHeader
        eyebrow="Money"
        title="Financials"
        subtitle={
          mode.mode === "admin"
            ? "Platform-wide settlement across all operators."
            : "Your operator earnings and settlement."
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross booking value" value={formatKobo(gross)} tone="primary" icon={<Wallet className="size-4" />} />
        <StatCard label="Platform commission" value={formatKobo(commission)} tone="info" icon={<Wallet className="size-4" />} />
        <StatCard label={mode.mode === "admin" ? "Net to operators" : "Your net"} value={formatKobo(net)} tone="success" icon={<Wallet className="size-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent ledger entries</CardTitle>
          <Badge tone="neutral">Append-only</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-muted p-6 text-sm">No ledger entries yet. Paid bookings post here.</p>
          ) : (
            <div className="divide-border divide-y">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium">
                      {ENTRY_LABEL[r.entry_type] ?? r.entry_type}
                    </p>
                    <p className="text-subtle text-xs">
                      {r.bookings?.reference ?? "—"} ·{" "}
                      {new Date(r.created_at).toLocaleString("en-NG")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${r.amount_kobo < 0 ? "text-danger" : "text-foreground"}`}
                  >
                    {formatKobo(r.amount_kobo)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
