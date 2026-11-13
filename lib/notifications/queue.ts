import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import { publicEnv } from "@/lib/env";
import { bookingConfirmationEmail } from "@/lib/notifications/templates";
import { sendEmail } from "@/lib/notifications/email";

type Admin = SupabaseClient<Database>;

/**
 * Queue (and best-effort send) the booking-confirmation email after a payment
 * is verified. Called from the payment webhook with the service-role client.
 *
 * This NEVER throws: a notification failure must not fail the webhook, because
 * the payment is already recorded. Every attempt is persisted to
 * `public.notifications` with a terminal status (sent / skipped / failed) for
 * observability and later retry.
 */
export async function notifyBookingConfirmed(admin: Admin, bookingId: string): Promise<void> {
  try {
    const { data: booking } = await admin
      .from("bookings")
      .select("reference, contact_name, contact_email, passenger_count, grand_total_kobo, vendor_id, schedule_id, created_by")
      .eq("id", bookingId)
      .single();
    if (!booking) return;

    if (!booking.contact_email) {
      await record(admin, bookingId, booking.created_by, null, "skipped", "no contact email");
      return;
    }

    const [{ data: schedule }, { data: vendor }] = await Promise.all([
      admin
        .from("schedules")
        .select("departure_at, origin_terminal_id, destination_terminal_id")
        .eq("id", booking.schedule_id)
        .single(),
      admin.from("vendors").select("name").eq("id", booking.vendor_id).single(),
    ]);

    const originCity = schedule ? await cityForTerminal(admin, schedule.origin_terminal_id) : "";
    const destinationCity = schedule
      ? await cityForTerminal(admin, schedule.destination_terminal_id)
      : "";

    const ticketUrl = `${publicEnv().NEXT_PUBLIC_APP_URL}/bookings/${booking.reference}`;
    const msg = bookingConfirmationEmail({
      contactName: booking.contact_name,
      reference: booking.reference,
      vendorName: vendor?.name ?? "your operator",
      originCity,
      destinationCity,
      departureAt: schedule?.departure_at ?? new Date().toISOString(),
      passengerCount: booking.passenger_count,
      grandTotalKobo: booking.grand_total_kobo,
      ticketUrl,
    });

    const result = await sendEmail({
      to: booking.contact_email,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });

    if (result.ok) {
      await record(admin, bookingId, booking.created_by, booking.contact_email, "sent", null, {
        subject: msg.subject,
        providerMessageId: result.providerMessageId,
      });
    } else if (!result.configured) {
      // No provider wired yet — recorded, not an error. Ops can backfill.
      await record(admin, bookingId, booking.created_by, booking.contact_email, "skipped", result.reason, {
        subject: msg.subject,
      });
    } else {
      await record(admin, bookingId, booking.created_by, booking.contact_email, "failed", result.reason, {
        subject: msg.subject,
      });
    }
  } catch (e) {
    // Last-resort: never propagate into the webhook response path.
    try {
      await record(admin, bookingId, null, null, "failed", e instanceof Error ? e.message : "unknown");
    } catch {
      /* swallow */
    }
  }
}

async function cityForTerminal(admin: Admin, terminalId: string): Promise<string> {
  const { data: terminal } = await admin
    .from("terminals")
    .select("city_id")
    .eq("id", terminalId)
    .single();
  if (!terminal) return "";
  const { data: city } = await admin.from("cities").select("name").eq("id", terminal.city_id).single();
  return city?.name ?? "";
}

async function record(
  admin: Admin,
  bookingId: string,
  userId: string | null,
  recipient: string | null,
  status: "sent" | "skipped" | "failed",
  error: string | null,
  payload: Json = {},
): Promise<void> {
  await admin.from("notifications").insert({
    user_id: userId,
    booking_id: bookingId,
    channel: "email",
    template: "booking_confirmed",
    recipient,
    payload,
    status,
    error,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}
