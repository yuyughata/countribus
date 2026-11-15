"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; error: string };

/** A passenger rates the operator after a paid trip (one review per booking). */
export async function submitReview(
  bookingId: string,
  rating: number,
  comment: string,
): Promise<Result> {
  const ctx = await requireUser();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Pick a rating from 1 to 5" };
  }
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("vendor_id, status, created_by, reference")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found" };
  if (b.created_by !== ctx.userId) return { ok: false, error: "Not your booking" };
  if (b.status !== "paid") return { ok: false, error: "You can review after a completed trip." };

  const { error } = await supabase.from("vendor_reviews").insert({
    vendor_id: b.vendor_id,
    booking_id: bookingId,
    user_id: ctx.userId,
    rating,
    comment: comment.trim() || null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "You've already reviewed this trip." };
    return { ok: false, error: error.message };
  }
  revalidatePath(`/bookings/${b.reference}`);
  return { ok: true };
}
