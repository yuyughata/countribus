import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PayoutAccount = {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
};

export async function getVendorPayoutAccount(vendorId: string): Promise<PayoutAccount | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_payout_accounts")
    .select("bank_name, bank_code, account_number, account_name, is_verified")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  return data ?? null;
}

export type PayoutRow = {
  id: string;
  vendor_id: string;
  amount_kobo: number;
  status: string;
  entry_count: number;
  created_at: string;
  processed_at: string | null;
  vendors: { name: string } | null;
};

/** Recent payouts — all for an admin (RLS), or the vendor's own. */
export async function listRecentPayouts(limit = 20): Promise<PayoutRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payouts")
    .select(
      "id, vendor_id, amount_kobo, status, entry_count, created_at, processed_at, vendors(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as PayoutRow[];
}

/** Total vendor_net that is not yet assigned to a payout (pending settlement). */
export async function pendingSettlementKobo(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_ledger")
    .select("amount_kobo")
    .eq("entry_type", "vendor_net")
    .is("payout_id", null);
  return (data ?? []).reduce((s, r) => s + (r as { amount_kobo: number }).amount_kobo, 0);
}
