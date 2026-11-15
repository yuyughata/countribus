import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/context";
import { userHasCapability } from "@/lib/permissions/dashboard-nav";
import { formatKoboAscii } from "@/lib/money";
import { buildReportPdf, type ReportKpi, type ReportTable } from "@/lib/reports/pdf";
import { dashboardMode, getAdminDashboard, getVendorDashboard } from "@/features/dashboard/queries";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!userHasCapability(ctx, "finance:view")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const mode = dashboardMode(ctx);

  let subtitle = "Platform performance across all operators.";
  const kpis: ReportKpi[] = [];
  const tables: ReportTable[] = [];

  if (mode.mode === "vendor") {
    subtitle = "Your operator performance.";
    const m = await getVendorDashboard(mode.vendorId);
    kpis.push(
      { label: "Gross bookings", value: formatKoboAscii(m?.gross_booking_kobo ?? 0) },
      { label: "Net revenue", value: formatKoboAscii(m?.net_kobo ?? 0) },
      { label: "Paid bookings", value: String(m?.bookings_paid ?? 0) },
      { label: "Upcoming trips", value: String(m?.upcoming_trips ?? 0) },
    );
  } else {
    const { metrics, revenue } = await getAdminDashboard();
    kpis.push(
      { label: "Gross booking value", value: formatKoboAscii(metrics?.gross_booking_kobo ?? 0) },
      { label: "Platform commission", value: formatKoboAscii(metrics?.commission_kobo ?? 0) },
      { label: "Paid bookings", value: String(metrics?.bookings_paid ?? 0) },
      { label: "Active trips", value: String(metrics?.active_trips ?? 0) },
      { label: "Approved vendors", value: String(metrics?.vendors ?? 0) },
      { label: "Passengers", value: String(metrics?.passengers ?? 0) },
    );
    tables.push({
      title: "Revenue trend (last 12 months)",
      columns: [
        { header: "Month", width: 0.5 },
        { header: "Gross booking value", width: 0.5, align: "right" },
      ],
      rows: revenue.map((r) => [r.month, formatKoboAscii(r.gross_kobo)]),
      empty: "No revenue recorded yet.",
    });
  }

  const pdf = await buildReportPdf({
    title: "Analytics & reporting",
    subtitle,
    meta: `Generated ${new Date().toLocaleString("en-NG")} · Countribus`,
    kpis,
    tables,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analytics.pdf"`,
    },
  });
}
