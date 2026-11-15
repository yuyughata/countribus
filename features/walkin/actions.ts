"use server";

import { requireUser } from "@/lib/auth/context";
import { publicEnv, serverEnv } from "@/lib/env";
import { formatKobo } from "@/lib/money";
import { sendEmail } from "@/lib/notifications/email";
import { initializePayment } from "@/lib/payments/providers";
import { can } from "@/lib/permissions/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type WalkinSeat = {
  seat_id: string;
  seat_label: string;
  state: "available" | "booked" | "held" | "blocked";
  surcharge_kobo: number;
};

/** Live seat map for the chosen departure (used by the counter seat picker). */
export async function loadWalkinSeatMap(scheduleId: string): Promise<WalkinSeat[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_seats")
    .select("seat_id, seat_label, state, surcharge_kobo")
    .eq("schedule_id", scheduleId)
    .order("seat_label");
  return (data ?? []) as WalkinSeat[];
}

export type WalkinInput = {
  scheduleId: string;
  contact: { name: string; phone: string; email?: string };
  passengers: {
    seat_id: string;
    full_name: string;
    phone?: string;
    type: "adult" | "child_6_10";
  }[];
  /** Lap infants (child 1–5): free, no seat. */
  infants?: { full_name: string }[];
};

export type WalkinResult =
  | {
      ok: true;
      reference: string;
      amountKobo: number;
      paymentUrl: string | null;
      emailed: boolean;
      note?: string;
    }
  | { ok: false; error: string };

/**
 * Record a walk-in (counter) booking. Creates a PENDING booking attributed to
 * the acting staff member (channel='walk_in', sold_by), then opens the normal
 * payment link (Paystack — card or bank transfer). The booking becomes paid
 * only from the verified provider webhook, exactly like an online booking. The
 * passenger is emailed the payment link; the staff member also gets it to share
 * or to read the bank-transfer account details.
 *
 * Authorization is enforced in the database (`create_walkin_booking` requires
 * owner/manager/booking-officer on the schedule's vendor, or platform admin)
 * and re-checked here for a clean early error. Prices are computed server-side.
 */
export async function createWalkInBooking(input: WalkinInput): Promise<WalkinResult> {
  const ctx = await requireUser();

  const authorized =
    ctx.isPlatformAdmin || ctx.memberships.some((m) => can(m.role, "booking:counter"));
  if (!authorized) {
    return { ok: false, error: "You are not authorized to record walk-in bookings" };
  }

  if (input.passengers.length === 0) {
    return { ok: false, error: "Add at least one seated passenger" };
  }
  for (const p of input.passengers) {
    if (!p.full_name.trim()) return { ok: false, error: "Enter every passenger's name" };
    if (!p.seat_id) return { ok: false, error: "Assign a seat to every passenger" };
  }
  if (!input.contact.name.trim() || !input.contact.phone.trim()) {
    return { ok: false, error: "Enter the lead passenger's name and phone number" };
  }

  const infants = (input.infants ?? []).filter((i) => i.full_name.trim());
  const contactEmail = input.contact.email?.trim() || undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_walkin_booking", {
    p_schedule: input.scheduleId,
    p_contact: { name: input.contact.name, phone: input.contact.phone, email: contactEmail },
    p_passengers: input.passengers,
    p_infants: infants,
  });
  if (error) {
    const m = /PROMO:(.+)/.exec(error.message);
    return { ok: false, error: m ? m[1].trim() : error.message };
  }

  const booking = (data as { booking_id: string; reference: string; amount_kobo: number }[])[0];
  if (!booking) return { ok: false, error: "Could not create the walk-in booking" };

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/walk-in");

  // Open the payment link. Needs server secrets (service role + provider key).
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: true,
      reference: booking.reference,
      amountKobo: booking.amount_kobo,
      paymentUrl: null,
      emailed: false,
      note: "Booking held. Payments aren't configured in this environment yet.",
    };
  }

  const env = serverEnv();
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const init = await initializePayment(
    "paystack",
    {
      paystackSecret: env.PAYSTACK_SECRET_KEY,
      flutterwaveSecret: env.FLUTTERWAVE_SECRET_KEY,
      flutterwaveHash: env.FLUTTERWAVE_WEBHOOK_HASH,
    },
    {
      amountKobo: booking.amount_kobo,
      email: contactEmail ?? ctx.email ?? "",
      reference: booking.reference,
      callbackUrl: `${appUrl}/bookings/${booking.reference}`,
    },
  );
  if (!init.ok) {
    return {
      ok: true,
      reference: booking.reference,
      amountKobo: booking.amount_kobo,
      paymentUrl: null,
      emailed: false,
      note: init.error,
    };
  }

  const admin = createAdminClient();
  await admin.from("payment_transactions").insert({
    booking_id: booking.booking_id,
    provider: "paystack",
    provider_reference: booking.reference,
    amount_kobo: booking.amount_kobo,
  });

  // Email the payment link to the passenger (best-effort; no account needed to pay).
  let emailed = false;
  if (contactEmail) {
    const amount = formatKobo(booking.amount_kobo);
    const res = await sendEmail({
      to: contactEmail,
      subject: `Complete your Countribus booking ${booking.reference}`,
      text: `Hello ${input.contact.name},\n\nYour booking ${booking.reference} is reserved. Please complete payment of ${amount} to confirm your seat(s):\n${init.checkoutUrl}\n\nYou can pay by card or bank transfer. Your seats are held for 30 minutes.\n\nCountribus`,
      html: `<p>Hello ${input.contact.name},</p><p>Your booking <strong>${booking.reference}</strong> is reserved. Please complete payment of <strong>${amount}</strong> to confirm your seat(s):</p><p><a href="${init.checkoutUrl}">Pay now</a></p><p>You can pay by card or bank transfer. Your seats are held for 30 minutes.</p><p>Countribus</p>`,
    });
    emailed = res.ok;
  }

  return {
    ok: true,
    reference: booking.reference,
    amountKobo: booking.amount_kobo,
    paymentUrl: init.checkoutUrl,
    emailed,
  };
}
