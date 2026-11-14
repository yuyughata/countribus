"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { HOMEPAGE_KEYS, type HomepageKey } from "@/lib/content/homepage";
import type { Json } from "@/lib/supabase/database.types";

export type Result = { ok: true } | { ok: false; error: string };

/** Save one homepage section (admin only). The whole section object is stored. */
export async function saveHomepageSection(key: HomepageKey, value: Json): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Only a platform admin can edit the homepage" };
  if (!HOMEPAGE_KEYS.includes(key)) return { ok: false, error: "Unknown section" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_content")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/dashboard/homepage");
  return { ok: true };
}
