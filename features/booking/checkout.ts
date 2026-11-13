"use server";

import { requireUser } from "@/lib/auth/context";
import { publicEnv, serverEnv } from "@/lib/env";
import { initializePayment } from "@/lib/payments/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PaymentProvider } from "@/lib/supabase/database.types";

export type CheckoutInput = {
  scheduleId: string;
  holdToken: string;
  provider: PaymentProvider;
  contact: { name: string; phone: string; email?: string };
  passengers: { seat_id: string; full_name: string; phone?: string }[];
  luggage?: { seat_id: string; type: string; quantity: number }[];
};

export type CheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: true; pending: true; reference: string; note: string }
  | { ok: false; error: string };

/**
 * Create the booking from the current hold (server computes the price), then
 * initialize payment with the chosen provider. If payments aren't configured in
 * this environment, the booking is created as pending and the caller is told —
 * nothing is faked as paid (confirmation only ever happens via a verified
 * provider webhook).
 */
export async function createBookingAndPay(input: CheckoutInput): Promise<CheckoutResult> {
  const ctx = await requireUser();
  if (input.passengers.length === 0) return { ok: false, error: "No passengers" };
  for (const p of input.passengers) {
    if (!p.full_name.trim()) return { ok: false, error: "Enter every passenger's name" };
  }
  if (!input.contact.name.trim() || !input.contact.phone.trim()) {
    return { ok: false, error: "Enter booking contact details" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking_from_hold", {
    p_schedule: input.scheduleId,
    p_hold_token: input.holdToken,
    p_contact: input.contact,
    p_passengers: input.passengers,
  });
  if (error) return { ok: false, error: error.message };
  const booking = (data as { booking_id: string; reference: string }[])[0];
  if (!booking) return { ok: false, error: "Could not create booking" };

  // Declare luggage (prices into the booking total) before reading the total.
  const bags = (input.luggage ?? []).filter((l) => l.quantity > 0);
  if (bags.length > 0) {
    await supabase.rpc("declare_luggage", { p_booking: booking.booking_id, p_items: bags });
  }

  const { data: bk } = await supabase
    .from("bookings")
    .select("grand_total_kobo")
    .eq("id", booking.booking_id)
    .single();
  const total = bk?.grand_total_kobo ?? 0;

  // Payment init requires server secrets (service role + provider key).
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: true,
      pending: true,
      reference: booking.reference,
      note: "Payments are not configured in this environment yet.",
    };
  }

  const env = serverEnv();
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const init = await initializePayment(
    input.provider,
    {
      paystackSecret: env.PAYSTACK_SECRET_KEY,
      flutterwaveSecret: env.FLUTTERWAVE_SECRET_KEY,
      flutterwaveHash: env.FLUTTERWAVE_WEBHOOK_HASH,
    },
    {
      amountKobo: total,
      email: input.contact.email ?? ctx.email ?? "",
      reference: booking.reference,
      callbackUrl: `${appUrl}/bookings/${booking.reference}`,
    },
  );
  if (!init.ok) {
    return { ok: true, pending: true, reference: booking.reference, note: init.error };
  }

  const admin = createAdminClient();
  await admin.from("payment_transactions").insert({
    booking_id: booking.booking_id,
    provider: input.provider,
    provider_reference: booking.reference,
    amount_kobo: total,
  });

  return { ok: true, checkoutUrl: init.checkoutUrl };
}
