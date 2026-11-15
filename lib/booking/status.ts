import type { Database } from "@/lib/supabase/database.types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

type Tone = "warning" | "success" | "danger" | "neutral";

/** Customer-facing status label (pending_payment → "Unpaid"). */
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Unpaid",
  paid: "Paid",
  failed: "Payment failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  expired: "Expired",
};

export const BOOKING_STATUS_TONE: Record<string, Tone> = {
  pending_payment: "warning",
  paid: "success",
  cancelled: "danger",
  refunded: "neutral",
  failed: "danger",
  expired: "neutral",
};

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}
