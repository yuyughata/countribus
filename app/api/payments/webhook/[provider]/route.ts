import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import {
  isSuccessStatus,
  verifyFlutterwaveWebhook,
  verifyPaystackWebhook,
  type WebhookVerification,
} from "@/lib/payments/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyBookingConfirmed } from "@/lib/notifications/queue";

/**
 * Provider webhook. A booking is confirmed ONLY here, after the signature is
 * verified and the amount independently re-checked inside confirm_payment().
 * Processing is idempotent (duplicate provider events are no-ops).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (provider !== "paystack" && provider !== "flutterwave") {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const raw = await req.text();
  const env = serverEnv();

  let v: WebhookVerification;
  if (provider === "paystack") {
    if (!env.PAYSTACK_WEBHOOK_SECRET)
      return NextResponse.json({ error: "not configured" }, { status: 503 });
    v = verifyPaystackWebhook(
      env.PAYSTACK_WEBHOOK_SECRET,
      raw,
      req.headers.get("x-paystack-signature"),
    );
  } else {
    if (!env.FLUTTERWAVE_WEBHOOK_HASH)
      return NextResponse.json({ error: "not configured" }, { status: 503 });
    v = verifyFlutterwaveWebhook(env.FLUTTERWAVE_WEBHOOK_HASH, raw, req.headers.get("verif-hash"));
  }

  if (!v.valid) return NextResponse.json({ error: v.reason }, { status: 401 });

  // Only a successful charge confirms a booking. Others are acknowledged.
  if (!isSuccessStatus(provider, v.status)) {
    return NextResponse.json({ result: "ignored", status: v.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_payment", {
    p_provider: provider,
    p_event_id: v.eventId,
    p_reference: v.reference,
    p_amount_kobo: v.amountKobo,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // On first-time confirmation, queue the booking-confirmation email. This is
  // best-effort and never fails the webhook (the payment is already recorded);
  // duplicate/idempotent events return other statuses and are not re-notified.
  if (data === "confirmed" && v.reference) {
    const { data: tx } = await admin
      .from("payment_transactions")
      .select("booking_id")
      .eq("provider", provider)
      .eq("provider_reference", v.reference)
      .maybeSingle();
    if (tx?.booking_id) await notifyBookingConfirmed(admin, tx.booking_id);
  }

  // TODO(prod hardening): independently GET the provider's verify endpoint
  // before confirming, in addition to the signed webhook + amount re-check.
  return NextResponse.json({ result: data });
}
