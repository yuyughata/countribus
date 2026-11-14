import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { initiateTransfer, transfersConfigured } from "@/lib/payments/paystack-transfers";

export type PayoutRunResult = {
  created: number;
  transferred: number;
  failed: number;
  totalKobo: number;
  configured: boolean;
};

/**
 * The payout engine: sweep unsettled vendor_net into scheduled payouts, then
 * push each scheduled payout to Paystack. Runs with the service-role client, so
 * it works both from the admin action and from the scheduled cron endpoint
 * (no user session). Never throws for a single transfer failure.
 */
export async function executePayouts(holdMinutes = 0): Promise<PayoutRunResult> {
  const admin = createAdminClient();
  await admin.rpc("process_due_payouts", { p_hold_minutes: holdMinutes });

  const { data: scheduled } = await admin
    .from("payouts")
    .select("id, vendor_id, amount_kobo")
    .eq("status", "scheduled");
  const rows = scheduled ?? [];

  const configured = transfersConfigured();
  let transferred = 0;
  let failed = 0;
  let totalKobo = 0;

  for (const p of rows) {
    totalKobo += p.amount_kobo;
    const { data: acct } = await admin
      .from("vendor_payout_accounts")
      .select("paystack_recipient_code")
      .eq("vendor_id", p.vendor_id)
      .maybeSingle();
    const recipient = acct?.paystack_recipient_code;
    if (!configured || !recipient) continue; // framework in place; stays scheduled

    const reference = `PO-${p.id.slice(0, 8).toUpperCase()}`;
    await admin
      .from("payouts")
      .update({ status: "processing", paystack_reference: reference })
      .eq("id", p.id);
    const tr = await initiateTransfer({
      amountKobo: p.amount_kobo,
      recipientCode: recipient,
      reference,
      reason: "Countribus vendor settlement",
    });
    if (tr.ok) {
      transferred++;
      await admin
        .from("payouts")
        .update({
          status: tr.data.status === "success" ? "paid" : "processing",
          paystack_transfer_code: tr.data.transfer_code,
          processed_at: new Date().toISOString(),
        })
        .eq("id", p.id);
    } else {
      failed++;
      await admin
        .from("payouts")
        .update({ status: "failed", failure_reason: tr.error })
        .eq("id", p.id);
    }
  }

  return { created: rows.length, transferred, failed, totalKobo, configured };
}
