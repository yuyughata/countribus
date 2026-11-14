"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

/** Mark all of the current user's unread in-app notifications as read. */
export async function markInAppRead(): Promise<{ ok: boolean }> {
  const ctx = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.userId)
    .eq("channel", "in_app")
    .is("read_at", null);
  revalidatePath("/dashboard");
  return { ok: true };
}
