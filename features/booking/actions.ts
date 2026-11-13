"use server";

import { createClient } from "@/lib/supabase/server";

export type HoldResult = { ok: true; expiresAt: string } | { ok: false; error: string };

/**
 * Hold seats for a checkout session. No auth required (guest checkout); the
 * hold is concurrency-safe and expires after 10 minutes (plan §7). The client
 * supplies an opaque hold token it keeps for the rest of the flow.
 */
export async function holdSeats(
  scheduleId: string,
  seatIds: string[],
  holdToken: string,
): Promise<HoldResult> {
  if (seatIds.length === 0) return { ok: false, error: "Select at least one seat" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("hold_seats", {
    p_schedule: scheduleId,
    p_seat_ids: seatIds,
    p_hold_token: holdToken,
    p_minutes: 10,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, expiresAt: data as string };
}

export async function releaseHold(scheduleId: string, holdToken: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("release_hold", { p_schedule: scheduleId, p_hold_token: holdToken });
}
