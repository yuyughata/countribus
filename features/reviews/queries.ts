import "server-only";

import { createClient } from "@/lib/supabase/server";

export type BookingReview = { rating: number; comment: string | null; created_at: string };

/** The current user's review for a booking, if they've left one. */
export async function getBookingReview(bookingId: string): Promise<BookingReview | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_reviews")
    .select("rating, comment, created_at")
    .eq("booking_id", bookingId)
    .maybeSingle();
  return (data as BookingReview | null) ?? null;
}
