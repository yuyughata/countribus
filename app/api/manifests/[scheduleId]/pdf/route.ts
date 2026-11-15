import { NextResponse, type NextRequest } from "next/server";

import { getManifest } from "@/features/ops/queries";
import { PASSENGER_TYPE_LABEL } from "@/lib/booking/passenger-types";
import { buildReportPdf } from "@/lib/reports/pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const { scheduleId } = await params;
  // RLS scopes getManifest to the caller's vendor / admin.
  const { schedule, rows } = await getManifest(scheduleId);
  if (!schedule) return NextResponse.json({ error: "not found" }, { status: 404 });

  const boarded = rows.filter((r) => r.boarding_status === "boarded").length;
  const bags = rows.reduce((n, r) => n + (r.luggage_items?.[0]?.count ?? 0), 0);

  const pdf = await buildReportPdf({
    title: "Travel manifest",
    subtitle: `${schedule.origin?.name ?? ""} → ${schedule.destination?.name ?? ""}`,
    meta: `${new Date(schedule.departure_at).toLocaleString("en-NG")} · ${rows.length} passengers · ${boarded} boarded · ${bags} bags`,
    tables: [
      {
        title: "Passengers",
        columns: [
          { header: "Seat", width: 0.08 },
          { header: "Passenger", width: 0.22 },
          { header: "Type", width: 0.14 },
          { header: "Booking", width: 0.16 },
          { header: "Phone", width: 0.16 },
          { header: "Boarding", width: 0.14 },
          { header: "Bags", width: 0.1, align: "right" },
        ],
        rows: rows.map((r) => [
          r.seat_label ?? "Lap infant",
          r.passengers?.full_name ?? "",
          PASSENGER_TYPE_LABEL[r.passenger_type],
          r.bookings?.reference ?? "",
          r.bookings?.contact_phone ?? "",
          r.boarding_status.replace(/_/g, " "),
          String(r.luggage_items?.[0]?.count ?? 0),
        ]),
        empty: "No paid passengers yet.",
      },
    ],
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="manifest-${scheduleId}.pdf"`,
    },
  });
}
