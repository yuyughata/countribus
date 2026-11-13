import { NextResponse, type NextRequest } from "next/server";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import { publicEnv } from "@/lib/env";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;
  const supabase = await createClient();

  // RLS restricts this to the booking owner / vendor staff / admin.
  const { data: ticket } = await supabase
    .from("ticket_documents")
    .select("id, qr_token, status, booking_id, passenger_id, schedule_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (ticket.status !== "active")
    return NextResponse.json({ error: "ticket not valid" }, { status: 409 });

  const [{ data: booking }, { data: bp }, { data: passenger }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "reference, grand_total_kobo, vendors(name), schedules(departure_at, origin:origin_terminal_id(name), destination:destination_terminal_id(name))",
      )
      .eq("id", ticket.booking_id)
      .maybeSingle(),
    supabase
      .from("booking_passengers")
      .select("seat_label, fare_kobo")
      .eq("booking_id", ticket.booking_id)
      .eq("passenger_id", ticket.passenger_id)
      .maybeSingle(),
    supabase.from("passengers").select("full_name").eq("id", ticket.passenger_id).maybeSingle(),
  ]);

  const b = booking as unknown as {
    reference: string;
    grand_total_kobo: number;
    vendors: { name: string } | null;
    schedules: {
      departure_at: string;
      origin: { name: string } | null;
      destination: { name: string } | null;
    } | null;
  } | null;

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const qrPng = await QRCode.toBuffer(`${appUrl}/verify/${ticket.qr_token}`, {
    width: 220,
    margin: 1,
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 620]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const orange = rgb(0.95, 0.53, 0.24);
  const ink = rgb(0.13, 0.13, 0.12);
  const muted = rgb(0.42, 0.42, 0.4);

  const left = 40;
  let y = 560;
  const line = (label: string, value: string) => {
    page.drawText(label, { x: left, y, size: 9, font, color: muted });
    page.drawText(value, { x: left, y: y - 14, size: 13, font: bold, color: ink });
    y -= 40;
  };

  page.drawRectangle({ x: 0, y: 590, width: 420, height: 30, color: orange });
  page.drawText("COUNTRIBUS E-TICKET", {
    x: left,
    y: 598,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });

  line("Booking reference", b?.reference ?? "—");
  line("Passenger", passenger?.full_name ?? "—");
  line("Operator", b?.vendors?.name ?? "—");
  line(
    "Route",
    `${b?.schedules?.origin?.name ?? "—"}  ->  ${b?.schedules?.destination?.name ?? "—"}`,
  );
  line(
    "Departure",
    b?.schedules ? new Date(b.schedules.departure_at).toLocaleString("en-NG") : "—",
  );
  line("Seat", bp?.seat_label ?? "—");
  line("Fare", bp ? formatKobo(bp.fare_kobo) : "—");

  const qrImage = await pdf.embedPng(qrPng);
  page.drawImage(qrImage, { x: left, y: 60, width: 130, height: 130 });
  page.drawText("Scan at the terminal to verify.", {
    x: left + 145,
    y: 120,
    size: 9,
    font,
    color: muted,
  });
  page.drawText("Arrive within the operator's check-in window.", {
    x: left + 145,
    y: 105,
    size: 9,
    font,
    color: muted,
  });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-${b?.reference ?? ticketId}.pdf"`,
    },
  });
}
