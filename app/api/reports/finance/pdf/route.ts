import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/context";
import { userHasCapability } from "@/lib/permissions/dashboard-nav";
import { createClient } from "@/lib/supabase/server";
import { formatKoboAscii } from "@/lib/money";
import { buildReportPdf, type ReportKpi, type ReportTable } from "@/lib/reports/pdf";
import { dashboardMode, getAdminDashboard, getVendorDashboard } from "@/features/dashboard/queries";
import { listRecentPayouts, pendingSettlementKobo } from "@/features/payouts/queries";

const ENTRY_LABEL: Record<string, string> = {
  booking_gross: "Booking (gross)",
  platform_commission: "Platform commission",
  vendor_net: "Vendor net",
  provider_fee: "Provider fee",
  refund: "Refund",
  reversal: "Reversal",
  adjustment: "Adjustment",
};

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!userHasCapability(ctx, "finance:view")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
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
  const [payouts, pendingSettlement] = await Promise.all([
    listRecentPayouts(25),
    mode.mode === "admin" ? pendingSettlementKobo() : Promise.resolve(0),
  ]);
  const { data: entries } = await supabase
    .from("financial_ledger")
    .select("entry_type, amount_kobo, created_at, bookings(reference)")
    .order("created_at", { ascending: false })
    .limit(60);
  const ledger = (entries ?? []) as unknown as {
    entry_type: string;
    amount_kobo: number;
    created_at: string;
    bookings: { reference: string } | null;
  }[];

  const kpis: ReportKpi[] = [
    { label: "Gross booking value", value: formatKoboAscii(gross) },
    { label: "Platform commission", value: formatKoboAscii(commission) },
    { label: mode.mode === "admin" ? "Net to operators" : "Your net", value: formatKoboAscii(net) },
  ];
  if (mode.mode === "admin") {
    kpis.push({ label: "Pending settlement", value: formatKoboAscii(pendingSettlement) });
  }

  const tables: ReportTable[] = [
    {
      title: "Vendor payouts",
      columns: [
        { header: "Vendor", width: 0.3 },
        { header: "Bookings", width: 0.14, align: "right" },
        { header: "Date", width: 0.26 },
        { header: "Status", width: 0.14 },
        { header: "Amount", width: 0.16, align: "right" },
      ],
      rows: payouts.map((p) => [
        p.vendors?.name ?? "Vendor",
        String(p.entry_count),
        new Date(p.created_at).toLocaleString("en-NG"),
        p.status,
        formatKoboAscii(p.amount_kobo),
      ]),
      empty: "No payouts yet.",
    },
    {
      title: "Recent ledger entries",
      columns: [
        { header: "Type", width: 0.3 },
        { header: "Booking", width: 0.24 },
        { header: "Date", width: 0.28 },
        { header: "Amount", width: 0.18, align: "right" },
      ],
      rows: ledger.map((r) => [
        ENTRY_LABEL[r.entry_type] ?? r.entry_type,
        r.bookings?.reference ?? "-",
        new Date(r.created_at).toLocaleString("en-NG"),
        formatKoboAscii(r.amount_kobo),
      ]),
      empty: "No ledger entries yet.",
    },
  ];

  const pdf = await buildReportPdf({
    title: "Financials",
    subtitle:
      mode.mode === "admin"
        ? "Platform-wide settlement across all operators."
        : "Your operator earnings and settlement.",
    meta: `Generated ${new Date().toLocaleString("en-NG")} · Countribus`,
    kpis,
    tables,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="financials.pdf"`,
    },
  });
}
