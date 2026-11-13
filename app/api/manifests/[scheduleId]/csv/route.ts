import { NextResponse, type NextRequest } from "next/server";

import { getManifest } from "@/features/ops/queries";

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const { scheduleId } = await params;
  // RLS scopes getManifest to the caller's vendor / admin; an unauthorized user
  // sees an empty manifest rather than another vendor's data.
  const { schedule, rows } = await getManifest(scheduleId);
  if (!schedule) return NextResponse.json({ error: "not found" }, { status: 404 });

  const header = ["Seat", "Passenger", "Booking", "Phone", "Boarding", "Bags"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.seat_label),
        csvCell(r.passengers?.full_name),
        csvCell(r.bookings?.reference),
        csvCell(r.bookings?.contact_phone),
        csvCell(r.boarding_status),
        csvCell(r.luggage_items?.[0]?.count ?? 0),
      ].join(","),
    );
  }
  const body = lines.join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="manifest-${scheduleId}.csv"`,
    },
  });
}
