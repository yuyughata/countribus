"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext, requireUser } from "@/lib/auth/context";
import { nairaToKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import {
  promoCodeInputSchema,
  referralProgramInputSchema,
  type PromoCodeInput,
  type ReferralProgramInput,
} from "@/lib/validation/promotions";

export type Result = { ok: true } | { ok: false; error: string };

function emptyToNull(s: string | null | undefined): string | null {
  return s && s.trim() !== "" ? s : null;
}

/** Create a promo code (platform admin only; RLS also enforces this). */
export async function createPromoCode(input: PromoCodeInput): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin)
    return { ok: false, error: "Only a platform admin can create promo codes" };

  const parsed = promoCodeInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid promo code" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").insert({
    code: v.code,
    description: emptyToNull(v.description),
    discount_percent: v.discountPercent,
    min_fare_kobo: nairaToKobo(v.minFareNaira ?? 0),
    max_discount_kobo: v.maxDiscountNaira != null ? nairaToKobo(v.maxDiscountNaira) : null,
    max_redemptions: v.maxRedemptions ?? null,
    max_per_customer: v.maxPerCustomer ?? null,
    starts_at: emptyToNull(v.startsAt),
    ends_at: emptyToNull(v.endsAt),
    is_active: v.isActive,
    created_by: ctx.userId,
  });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "A promo code with that name already exists" };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/promotions");
  return { ok: true };
}

export async function togglePromoCode(id: string, isActive: boolean): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Not allowed" };
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/promotions");
  return { ok: true };
}

export async function deletePromoCode(id: string): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Not allowed" };
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/promotions");
  return { ok: true };
}

/** Save the referral-program config (platform admin only). */
export async function saveReferralProgram(input: ReferralProgramInput): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin)
    return { ok: false, error: "Only a platform admin can edit the referral program" };

  const parsed = referralProgramInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("referral_program")
    .update({
      is_enabled: v.isEnabled,
      referrer_percent: v.referrerPercent,
      min_qualifying_fare_kobo: nairaToKobo(v.minQualifyingFareNaira ?? 0),
      reward_max_discount_kobo:
        v.rewardMaxDiscountNaira != null ? nairaToKobo(v.rewardMaxDiscountNaira) : null,
      reward_validity_days: v.rewardValidityDays ?? null,
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/promotions");
  revalidatePath("/account");
  return { ok: true };
}

export type PromoPreview = { ok: true; discountKobo: number } | { ok: false; reason: string };

/**
 * Live promo-code preview for checkout. Recomputes server-side against the fare;
 * the real charge is recomputed again inside create_booking_from_hold, so this
 * is only a convenience for the UI (never trusted as the price).
 */
export async function previewPromoCode(code: string, fareKobo: number): Promise<PromoPreview> {
  const ctx = await getAuthContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("promo_quote", {
    p_code: code,
    p_fare_kobo: fareKobo,
    // p_user is nullable in SQL (anonymous checkout), but the generated type
    // marks it required; null is the correct value for a guest.
    p_user: (ctx?.userId ?? null) as unknown as string,
  });
  if (error) return { ok: false, reason: "Could not check that code" };
  const row = (
    data as { promo_id: string | null; discount_kobo: number; reason: string | null }[]
  )?.[0];
  if (!row || row.reason)
    return { ok: false, reason: row?.reason ?? "That promo code is not valid" };
  return { ok: true, discountKobo: row.discount_kobo };
}
