import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import QRCode from "qrcode";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { SiteHeader } from "@/components/marketing/site-chrome";
import { PoweredBy } from "@/components/brand/logo";
import { getAuthContext } from "@/lib/auth/context";
import { publicEnv } from "@/lib/env";
import { formatKobo } from "@/lib/money";
import { getBookingByReference } from "@/features/booking/account";

export const metadata = { title: "Booking" };

const tone: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  pending_payment: "warning",
  paid: "success",
  cancelled: "danger",
  refunded: "neutral",
  failed: "danger",
  expired: "neutral",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect(`/login?next=/bookings/${reference}`);

  const data = await getBookingByReference(reference);
  if (!data) notFound();
  const { booking, passengers, tickets } = data;

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const qrByToken: Record<string, string> = {};
  for (const t of tickets) {
    if (t.status === "active") {
      qrByToken[t.id] = await QRCode.toDataURL(`${appUrl}/verify/${t.qr_token}`, {
        width: 160,
        margin: 1,
      });
    }
  }
  const ticketByPassenger = new Map(tickets.map((t) => [t.passenger_id, t]));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
        <Link href="/bookings" className="text-muted hover:text-foreground text-sm">
          ← My bookings
        </Link>

        {booking.status === "paid" && (
          <div className="bg-success-soft text-success flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
            <span className="bg-success size-2 rounded-full" />
            Payment confirmed — your e-ticket is ready. Confirmation sent by email, SMS & WhatsApp.
          </div>
        )}

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {booking.reference}
            <Badge tone={tone[booking.status] ?? "neutral"}>
              {booking.status.replace("_", " ")}
            </Badge>
          </CardTitle>
          {(booking.status === "pending_payment" || booking.status === "paid") && (
            <CancelBookingButton bookingId={booking.id} reference={booking.reference} />
          )}
        </CardHeader>
        <CardContent className="text-muted space-y-3 text-sm">
          <div className="space-y-1">
            <p className="text-foreground text-base font-semibold">
              {booking.schedules?.origin?.name} → {booking.schedules?.destination?.name}
            </p>
            <p>
              {booking.vendors?.name} ·{" "}
              {booking.schedules
                ? new Date(booking.schedules.departure_at).toLocaleString("en-NG")
                : ""}
            </p>
            <p>Total paid: {formatKobo(booking.grand_total_kobo)}</p>
          </div>

          <div className="border-border grid gap-3 border-t pt-3 sm:grid-cols-2">
            <div>
              <p className="text-accent text-[11px] font-semibold tracking-wide uppercase">
                Boarding address
              </p>
              <p className="text-foreground mt-0.5">
                {booking.schedules?.boarding_address ||
                  booking.schedules?.origin?.address ||
                  booking.schedules?.origin?.name ||
                  "—"}
              </p>
            </div>
            <div>
              <p className="text-accent text-[11px] font-semibold tracking-wide uppercase">
                Contact number
              </p>
              <p className="text-foreground mt-0.5">
                {booking.schedules?.boarding_contact_phone ||
                  booking.vendors?.contact_phone ||
                  "—"}
              </p>
            </div>
          </div>

          {booking.status === "pending_payment" && (
            <p className="text-warning">
              Payment pending — your seats are held while you complete payment.
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-foreground mb-2 text-sm font-semibold">Passengers & tickets</h2>
        <div className="space-y-3">
          {passengers.map((p, i) => {
            const t = ticketByPassenger.get(
              (p as unknown as { passenger_id?: string }).passenger_id ?? "",
            );
            return (
              <Card key={i} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-foreground text-sm font-semibold">{p.passengers?.full_name}</p>
                  <p className="text-muted text-xs">
                    Seat {p.seat_label} · {formatKobo(p.fare_kobo)} ·{" "}
                    {p.boarding_status.replace("_", " ")}
                  </p>
                </div>
                {booking.status === "paid" && t?.status === "active" ? (
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrByToken[t.id]}
                      alt="Ticket QR"
                      className="size-20 rounded bg-white p-1"
                    />
                    <a
                      href={`/api/tickets/${t.id}/pdf`}
                      className="text-primary text-xs font-medium"
                    >
                      Download PDF
                    </a>
                  </div>
                ) : (
                  <span className="text-subtle text-xs">
                    {booking.status === "paid" ? "ticket voided" : "ticket after payment"}
                  </span>
                )}
              </Card>
            );
          })}
        </div>
        </div>

        <div className="flex justify-center pt-2">
          <PoweredBy />
        </div>
      </main>
    </>
  );
}
