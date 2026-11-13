import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import { publicEnv } from "@/lib/env";
import { bookingConfirmationEmail, bookingConfirmationSms } from "@/lib/notifications/templates";
import { sendEmail, type SendResult } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";

type Admin = SupabaseClient<Database>;
type Channel = "email" | "sms" | "whatsapp";

/**
 * Queue (and best-effort send) the booking-confirmation notifications after a
 * payment is verified — email, SMS and WhatsApp. Called from the payment
 * webhook with the service-role client.
 *
 * This NEVER throws: a notification failure must not fail the webhook, because
 * the payment is already recorded. Every attempt is persisted to
 * `public.notifications` with a terminal status (sent / skipped / failed).
 */
export async function notifyBookingConfirmed(admin: Admin, bookingId: string): Promise<void> {
  try {
    const { data: booking } = await admin
      .from("bookings")
      .select(
        "reference, contact_name, contact_email, contact_phone, passenger_count, grand_total_kobo, vendor_id, schedule_id, created_by",
      )
      .eq("id", bookingId)
      .single();
    if (!booking) return;

    const [{ data: schedule }, { data: vendor }] = await Promise.all([
      admin
        .from("schedules")
        .select(
          "departure_at, origin_terminal_id, destination_terminal_id, boarding_address, boarding_contact_phone",
        )
        .eq("id", booking.schedule_id)
        .single(),
      admin.from("vendors").select("name, contact_phone").eq("id", booking.vendor_id).single(),
    ]);

    const origin = schedule
      ? await terminal(admin, schedule.origin_terminal_id)
      : { city: "", address: "" };
    const destination = schedule
      ? await terminal(admin, schedule.destination_terminal_id)
      : { city: "", address: "" };

    const boardingAddress =
      schedule?.boarding_address || origin.address || origin.city || "the terminal";
    const contactPhone =
      schedule?.boarding_contact_phone || vendor?.contact_phone || "the operator";
    const ticketUrl = `${publicEnv().NEXT_PUBLIC_APP_URL}/bookings/${booking.reference}`;

    const base = {
      contactName: booking.contact_name,
      reference: booking.reference,
      vendorName: vendor?.name ?? "your operator",
      originCity: origin.city,
      destinationCity: destination.city,
      departureAt: schedule?.departure_at ?? new Date().toISOString(),
      passengerCount: booking.passenger_count,
      grandTotalKobo: booking.grand_total_kobo,
      ticketUrl,
    };

    // --- Email ------------------------------------------------------------
    if (booking.contact_email) {
      const msg = bookingConfirmationEmail(base);
      const r = await sendEmail({
        to: booking.contact_email,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      await recordResult(admin, bookingId, booking.created_by, "email", booking.contact_email, r, {
        subject: msg.subject,
      });
    } else {
      await record(admin, bookingId, booking.created_by, "email", null, "skipped", "no contact email");
    }

    // --- SMS + WhatsApp ---------------------------------------------------
    if (booking.contact_phone) {
      const text = bookingConfirmationSms({ ...base, boardingAddress, contactPhone });
      const [sms, wa] = await Promise.all([
        sendSms(booking.contact_phone, text),
        sendWhatsApp(booking.contact_phone, text),
      ]);
      await recordResult(admin, bookingId, booking.created_by, "sms", booking.contact_phone, sms, {
        ticketId: booking.reference,
      });
      await recordResult(admin, bookingId, booking.created_by, "whatsapp", booking.contact_phone, wa, {
        ticketId: booking.reference,
      });
    } else {
      await record(admin, bookingId, booking.created_by, "sms", null, "skipped", "no contact phone");
      await record(admin, bookingId, booking.created_by, "whatsapp", null, "skipped", "no contact phone");
    }
  } catch (e) {
    try {
      await record(admin, bookingId, null, "email", null, "failed", e instanceof Error ? e.message : "unknown");
    } catch {
      /* swallow */
    }
  }
}

async function terminal(admin: Admin, terminalId: string): Promise<{ city: string; address: string }> {
  const { data: t } = await admin
    .from("terminals")
    .select("city_id, address")
    .eq("id", terminalId)
    .single();
  if (!t) return { city: "", address: "" };
  const { data: city } = await admin.from("cities").select("name").eq("id", t.city_id).single();
  return { city: city?.name ?? "", address: t.address ?? "" };
}

/** Map a transport SendResult to a persisted notification row. */
async function recordResult(
  admin: Admin,
  bookingId: string,
  userId: string | null,
  channel: Channel,
  recipient: string | null,
  result: SendResult,
  payload: Json = {},
): Promise<void> {
  if (result.ok) {
    await record(admin, bookingId, userId, channel, recipient, "sent", null, payload, result.providerMessageId);
  } else if (!result.configured) {
    await record(admin, bookingId, userId, channel, recipient, "skipped", result.reason, payload);
  } else {
    await record(admin, bookingId, userId, channel, recipient, "failed", result.reason, payload);
  }
}

async function record(
  admin: Admin,
  bookingId: string,
  userId: string | null,
  channel: Channel,
  recipient: string | null,
  status: "sent" | "skipped" | "failed",
  error: string | null,
  payload: Json = {},
  providerMessageId: string | null = null,
): Promise<void> {
  await admin.from("notifications").insert({
    user_id: userId,
    booking_id: bookingId,
    channel,
    template: "booking_confirmed",
    recipient,
    payload,
    status,
    error,
    provider_message_id: providerMessageId,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}
