"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
  phone: z.string().trim().max(30).optional(),
});

export type Result = { ok: true } | { ok: false; error: string };

export async function updateProfile(input: unknown): Promise<Result> {
  const ctx = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null })
    .eq("id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/profile");
  return { ok: true };
}
