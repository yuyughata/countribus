"use server";

import { requireUser } from "@/lib/auth/context";
import { canForVendor } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SetRuleInput = {
  vendorId: string;
  staffId: string | null; // null = vendor-wide default
  kind: "fixed" | "percent";
  fixedKobo?: number;
  rateBps?: number;
};

/** Configure a fixed or percentage incentive (owner/admin). */
export async function setIncentiveRule(input: SetRuleInput): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!canForVendor(ctx, input.vendorId, "incentive:manage")) {
    return { ok: false, error: "You are not authorized to set incentives for this operator" };
  }
  if (input.kind === "fixed" && (input.fixedKobo == null || input.fixedKobo < 0)) {
    return { ok: false, error: "Enter a valid fixed amount" };
  }
  if (input.kind === "percent" && (input.rateBps == null || input.rateBps < 0 || input.rateBps > 10000)) {
    return { ok: false, error: "Enter a percentage between 0 and 100" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_staff_incentive_rule", {
    p_vendor: input.vendorId,
    p_staff: input.staffId,
    p_kind: input.kind,
    p_fixed_kobo: input.kind === "fixed" ? input.fixedKobo : undefined,
    p_rate_bps: input.kind === "percent" ? input.rateBps : undefined,
  });
  if (error) return { ok: false, error: error.message };

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/permissions");
  return { ok: true };
}

export type PayResult = { ok: true; amountKobo: number } | { ok: false; error: string };

/** Record a payout that settles a staff member's outstanding incentives. */
export async function payStaffIncentive(
  vendorId: string,
  staffId: string,
  note?: string,
): Promise<PayResult> {
  const ctx = await requireUser();
  if (!canForVendor(ctx, vendorId, "incentive:manage")) {
    return { ok: false, error: "You are not authorized to record incentive payments" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_staff_incentive_payment", {
    p_vendor: vendorId,
    p_staff: staffId,
    p_note: note?.trim() || undefined,
  });
  if (error) return { ok: false, error: error.message };
  const row = (data as { payment_id: string; amount_kobo: number }[])[0];

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/permissions");
  return { ok: true, amountKobo: row?.amount_kobo ?? 0 };
}
