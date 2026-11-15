"use server";

import { requireUser } from "@/lib/auth/context";
import { publicEnv, serverEnv } from "@/lib/env";
import { initializePayment } from "@/lib/payments/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ResumeResult =
  | { ok: true; checkoutUrl: string }
  | { ok: true; pending: true; note: string }
  | { ok: false; error: string };

/**
 * Re-initialise payment for an unpaid booking so the customer can complete it
 * any time before the 30-minute window closes. Sweeps overdue bookings first so
 * an already-expired one reports correctly. A booking only becomes paid from a
 * verified provider webhook — this just re-opens the payment page.
 */
export async function resumeBookingPayment(reference: string): Promise<ResumeResult> {
  const ctx = await requireUser();
  const supabase = await createClient();

  // Auto-cancel anything past its deadline before we check this one.
  await supabase.rpc("expire_overdue_bookings");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, status, grand_total_kobo, contact_email, payment_deadline")
    .eq("reference", reference)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status !== "pending_payment") {
    return {
      ok: false,
      error:
        booking.status === "paid"
          ? "This booking is already paid."
          : "This booking is no longer awaiting payment.",
    };
  }
  if (new Date(booking.payment_deadline).getTime() < Date.now()) {
    return { ok: false, error: "This booking's payment window has closed." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, pending: true, note: "Payments aren't configured in this environment yet." };
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
      amountKobo: booking.grand_total_kobo,
      email: booking.contact_email ?? ctx.email ?? "",
      reference: booking.reference,
      callbackUrl: `${appUrl}/bookings/${booking.reference}`,
    },
  );
  if (!init.ok) return { ok: true, pending: true, note: init.error };

  const admin = createAdminClient();
  await admin.from("payment_transactions").insert({
    booking_id: booking.id,
    provider: "paystack",
    provider_reference: booking.reference,
    amount_kobo: booking.grand_total_kobo,
  });

  return { ok: true, checkoutUrl: init.checkoutUrl };
}
