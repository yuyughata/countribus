"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type BoardingEvent = "checked_in" | "boarded" | "no_show";

export async function recordBoarding(
  scheduleId: string,
  bookingPassengerId: string,
  event: BoardingEvent,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_boarding", {
    p_bp: bookingPassengerId,
    p_event: event,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/manifests/${scheduleId}`);
  return { ok: true };
}
