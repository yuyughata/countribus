"use server";

import { revalidatePath } from "next/cache";

import { firstManageableVendorId, requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  createTransferRecipient,
  resolveAccount,
  transfersConfigured,
} from "@/lib/payments/paystack-transfers";
import { executePayouts } from "@/lib/payments/run-payouts";
import { payoutAccountSchema, type PayoutAccountInput } from "@/lib/validation/payouts";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Save (or update) a vendor's payout bank account. When Paystack is configured
 * the account is resolved + a transfer recipient is created, marking it
 * verified; otherwise it is stored unverified (payouts won't run until a
 * recipient exists). Vendor owner/manager edits their own; admins may pass a
 * vendorId.
 */
export async function saveVendorPayoutAccount(
  input: PayoutAccountInput,
  vendorIdArg?: string,
): Promise<Result> {
  const ctx = await requireUser();
  const vendorId = ctx.isPlatformAdmin && vendorIdArg ? vendorIdArg : firstManageableVendorId(ctx);
  if (!vendorId) return { ok: false, error: "No vendor to manage" };

  const parsed = payoutAccountSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const v = parsed.data;

  let accountName = v.accountName?.trim() || "";
  let recipientCode: string | null = null;
  let verified = false;

  if (transfersConfigured()) {
    const resolved = await resolveAccount(v.accountNumber, v.bankCode);
    if (!resolved.ok) return { ok: false, error: `Could not verify account: ${resolved.error}` };
    accountName = resolved.data.account_name;
    const recipient = await createTransferRecipient({
      name: accountName,
      accountNumber: v.accountNumber,
      bankCode: v.bankCode,
    });
    if (!recipient.ok)
      return { ok: false, error: `Could not set up transfers: ${recipient.error}` };
    recipientCode = recipient.data.recipient_code;
    verified = true;
  }

  if (!accountName) return { ok: false, error: "Enter the account holder name" };

  const supabase = await createClient();
  const { error } = await supabase.from("vendor_payout_accounts").upsert(
    {
      vendor_id: vendorId,
      bank_name: v.bankName,
      bank_code: v.bankCode,
      account_number: v.accountNumber,
      account_name: accountName,
      paystack_recipient_code: recipientCode,
      is_verified: verified,
      updated_by: ctx.userId,
    },
    { onConflict: "vendor_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings");
  return {
    ok: true,
    message: verified
      ? `Verified — account holder: ${accountName}`
      : "Saved. Automatic payouts activate once Paystack transfers are configured.",
  };
}

export type RunPayoutsResult =
  | { ok: true; created: number; transferred: number; totalKobo: number; note?: string }
  | { ok: false; error: string };

/**
 * Admin: sweep unsettled vendor_net into scheduled payouts, then push each to
 * Paystack. Designed to be called on a schedule (so vendors are paid within
 * 24h) and manually from the Finance page. Uses the service-role client.
 */
export async function runPayouts(holdMinutes = 0): Promise<RunPayoutsResult> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Only a platform admin can run payouts" };

  const r = await executePayouts(holdMinutes);
  revalidatePath("/dashboard/finance");
  return {
    ok: true,
    created: r.created,
    transferred: r.transferred,
    totalKobo: r.totalKobo,
    note: r.configured
      ? undefined
      : "Paystack transfers are not configured, so payouts were scheduled but not sent.",
  };
}
