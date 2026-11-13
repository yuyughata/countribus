"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  // Percentage, 0–100, up to 2 decimals (e.g. 12.5).
  percent: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
});

export type Result = { ok: true; percent: number } | { ok: false; error: string };

/**
 * Set the marketplace commission percentage (platform scope). Admin-only — the
 * check is enforced again inside the SECURITY DEFINER RPC and audited there.
 */
export async function setPlatformCommission(input: unknown): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Only a platform admin can set commission" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const bps = Math.round(parsed.data.percent * 100);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_platform_commission", { p_bps: bps });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings");
  return { ok: true, percent: bps / 100 };
}
