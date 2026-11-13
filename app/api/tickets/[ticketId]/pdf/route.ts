import { NextResponse, type NextRequest } from "next/server";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import { publicEnv } from "@/lib/env";
import { formatKoboAscii } from "@/lib/money";
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
        "reference, grand_total_kobo, vendors(name, contact_phone), schedules(departure_at, boarding_address, boarding_contact_phone, origin:origin_terminal_id(name, address), destination:destination_terminal_id(name))",
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
    vendors: { name: string; contact_phone: string | null } | null;
    schedules: {
      departure_at: string;
      boarding_address: string | null;
      boarding_contact_phone: string | null;
      origin: { name: string; address: string | null } | null;
      destination: { name: string } | null;
    } | null;
  } | null;

  const sched = b?.schedules;
  const boardingAddress =
    sched?.boarding_address || sched?.origin?.address || sched?.origin?.name || "—";
  const contactPhone = sched?.boarding_contact_phone || b?.vendors?.contact_phone || "—";

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const qrPng = await QRCode.toBuffer(`${appUrl}/verify/${ticket.qr_token}`, {
    width: 240,
    margin: 1,
    color: { dark: "#0b1c36", light: "#ffffff" },
  });

  // --- Document -----------------------------------------------------------
  const W = 430;
  const H = 640;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([W, H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.043, 0.11, 0.21); // #0B1C36 brand ink navy
  const gold = rgb(0.78, 0.63, 0.36); // #C8A15C accent
  const white = rgb(1, 1, 1);
  const paper = rgb(0.99, 0.985, 0.975);
  const text = rgb(0.13, 0.14, 0.16);
  const muted = rgb(0.46, 0.47, 0.44);
  const hair = rgb(0.9, 0.89, 0.85);

  const M = 32;
  // pdf-lib standard fonts are WinAnsi — strip any code point they can't encode
  // (e.g. ₦, →, emoji) so unexpected input never crashes ticket generation.
  const safe = (s: string) => s.replace(/[^\x00-\xff]/g, "");
  const draw = (
    s: string,
    x: number,
    y: number,
    size: number,
    f = font,
    color = text,
  ) => page.drawText(safe(s), { x, y, size, font: f, color });

  // Background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: paper });

  // Header band (ink) with gold hairline
  const headH = 92;
  page.drawRectangle({ x: 0, y: H - headH, width: W, height: headH, color: ink });
  page.drawRectangle({ x: 0, y: H - headH, width: W, height: 3, color: gold });

  // Brand mark: gold rounded square + pin dot
  page.drawRectangle({ x: M, y: H - 52, width: 26, height: 26, color: gold });
  page.drawCircle({ x: M + 13, y: H - 39, size: 5.5, color: ink });
  draw("countribus", M + 36, H - 46, 17, bold, white);
  draw("E-TICKET", W - M - bold.widthOfTextAtSize("E-TICKET", 11), H - 44, 11, bold, gold);
  draw(
    "Intercity travel across Nigeria",
    M + 36,
    H - 62,
    8.5,
    font,
    rgb(0.75, 0.78, 0.84),
  );

  // Route headline
  let y = H - headH - 40;
  const origin = sched?.origin?.name ?? "—";
  const dest = sched?.destination?.name ?? "—";
  draw(origin, M, y, 20, bold, ink);
  const ow = bold.widthOfTextAtSize(safe(origin), 20);
  // Gold chevron (drawn, not a glyph — avoids the un-encodable → character).
  const ax = M + ow + 14;
  const my = y + 6;
  page.drawLine({ start: { x: ax, y: my + 5 }, end: { x: ax + 7, y: my }, thickness: 2.2, color: gold });
  page.drawLine({ start: { x: ax, y: my - 5 }, end: { x: ax + 7, y: my }, thickness: 2.2, color: gold });
  draw(dest, M + ow + 32, y, 20, bold, ink);

  y -= 16;
  draw(
    sched ? new Date(sched.departure_at).toLocaleString("en-NG", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—",
    M,
    y,
    10,
    font,
    muted,
  );

  // Field grid
  y -= 28;
  const col2 = W / 2 + 6;
  const field = (label: string, value: string, x: number, yy: number) => {
    draw(label.toUpperCase(), x, yy, 7.5, bold, gold);
    draw(value, x, yy - 15, 12, bold, text);
  };
  const rowGap = 46;
  field("Ticket ID", b?.reference ?? "—", M, y);
  field("Seat", bp?.seat_label ?? "—", col2, y);
  y -= rowGap;
  field("Passenger", passenger?.full_name ?? "—", M, y);
  field("Fare", bp ? formatKoboAscii(bp.fare_kobo) : "—", col2, y);
  y -= rowGap;
  field("Operator", b?.vendors?.name ?? "—", M, y);
  field("Contact", contactPhone, col2, y);

  // Boarding address (full width, wrapped)
  y -= rowGap;
  draw("BOARDING ADDRESS", M, y, 7.5, bold, gold);
  const wrap = (s: string, max: number, size: number, f = bold) => {
    const words = s.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(t, size) > max && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  let ay = y - 15;
  for (const ln of wrap(boardingAddress, W - 2 * M, 12).slice(0, 2)) {
    draw(ln, M, ay, 12, bold, text);
    ay -= 15;
  }

  // Divider
  const divY = 214;
  page.drawLine({ start: { x: M, y: divY }, end: { x: W - M, y: divY }, thickness: 1, color: hair });

  // QR + verify
  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 116;
  page.drawImage(qrImage, { x: M, y: divY - qrSize - 20, width: qrSize, height: qrSize });
  const qx = M + qrSize + 20;
  draw("SCAN TO VERIFY", qx, divY - 26, 8, bold, gold);
  draw("Present this ticket at the", qx, divY - 44, 9.5, font, muted);
  draw("terminal to board. Arrive within", qx, divY - 58, 9.5, font, muted);
  draw("the operator's check-in window.", qx, divY - 72, 9.5, font, muted);

  // Footer: Powered by Countribus
  page.drawRectangle({ x: 0, y: 0, width: W, height: 48, color: ink });
  page.drawRectangle({ x: 0, y: 45, width: W, height: 2, color: gold });
  const pb = "Powered by";
  draw(pb, M, 20, 9, font, rgb(0.75, 0.78, 0.84));
  const pbw = font.widthOfTextAtSize(pb, 9);
  page.drawRectangle({ x: M + pbw + 8, y: 15, width: 13, height: 13, color: gold });
  page.drawCircle({ x: M + pbw + 14.5, y: 21.5, size: 2.8, color: ink });
  draw("countribus", M + pbw + 26, 17, 11, bold, white);
  draw(
    b?.reference ?? "",
    W - M - font.widthOfTextAtSize(b?.reference ?? "", 8.5),
    18,
    8.5,
    font,
    rgb(0.6, 0.64, 0.72),
  );

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-${b?.reference ?? ticketId}.pdf"`,
    },
  });
}
