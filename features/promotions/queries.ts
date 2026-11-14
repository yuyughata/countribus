import "server-only";

import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  min_fare_kobo: number;
  max_discount_kobo: number | null;
  max_redemptions: number | null;
  max_per_customer: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  redemptions: number;
};

export type ReferralProgram = {
  is_enabled: boolean;
  referrer_percent: number;
  min_qualifying_fare_kobo: number;
  reward_max_discount_kobo: number | null;
  reward_validity_days: number | null;
};

/** All promo codes with a live redemption count (admin only — RLS enforces). */
export async function listPromoCodes(): Promise<PromoCode[]> {
  const supabase = await createClient();
  const { data: codes } = await supabase
    .from("promo_codes")
    .select(
      "id, code, description, discount_percent, min_fare_kobo, max_discount_kobo, max_redemptions, max_per_customer, starts_at, ends_at, is_active, created_at",
    )
    .order("created_at", { ascending: false });
  if (!codes || codes.length === 0) return [];

  // Redemption counts (bookings still holding the code).
  const { data: used } = await supabase
    .from("bookings")
    .select("promo_code_id")
    .in("status", ["pending_payment", "paid"])
    .not("promo_code_id", "is", null);
  const counts = new Map<string, number>();
  for (const b of used ?? []) {
    const id = (b as { promo_code_id: string | null }).promo_code_id;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return codes.map((c) => ({ ...c, redemptions: counts.get(c.id) ?? 0 }));
}

export async function getReferralProgram(): Promise<ReferralProgram> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referral_program")
    .select(
      "is_enabled, referrer_percent, min_qualifying_fare_kobo, reward_max_discount_kobo, reward_validity_days",
    )
    .eq("id", true)
    .maybeSingle();
  return (
    data ?? {
      is_enabled: false,
      referrer_percent: 10,
      min_qualifying_fare_kobo: 0,
      reward_max_discount_kobo: null,
      reward_validity_days: null,
    }
  );
}

export type MyReferral = {
  code: string | null;
  referredCount: number;
  qualifiedCount: number;
  availableRewardPercent: number | null;
  program: ReferralProgram;
};

/** The signed-in user's referral code, stats, and best available reward. */
export async function getMyReferral(): Promise<MyReferral | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [{ data: profile }, { data: refs }, { data: rewards }, program] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", ctx.userId).maybeSingle(),
    supabase.from("referrals").select("status").eq("referrer_id", ctx.userId),
    supabase
      .from("referral_rewards")
      .select("discount_percent")
      .eq("referrer_id", ctx.userId)
      .eq("status", "available")
      .order("discount_percent", { ascending: false })
      .limit(1),
    getReferralProgram(),
  ]);

  return {
    code: profile?.referral_code ?? null,
    referredCount: refs?.length ?? 0,
    qualifiedCount: (refs ?? []).filter((r) => (r as { status: string }).status === "qualified")
      .length,
    availableRewardPercent: rewards?.[0]?.discount_percent ?? null,
    program,
  };
}
