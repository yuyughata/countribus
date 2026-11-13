import type { PassengerType } from "@/lib/supabase/database.types";

/** Passenger types that occupy a selected seat. */
export type SeatedType = "adult" | "child_6_10";

export const SEATED_TYPE_OPTIONS: { value: SeatedType; label: string; note: string }[] = [
  { value: "adult", label: "Adult", note: "Full fare" },
  { value: "child_6_10", label: "Child (6–10)", note: "Half fare" },
];

export const PASSENGER_TYPE_LABEL: Record<PassengerType, string> = {
  adult: "Adult",
  child_1_5: "Child (1–5, lap)",
  child_6_10: "Child (6–10)",
};

/**
 * Fare for a seated passenger by type. MUST mirror the server
 * (`create_booking_from_hold`): adult = full, child 6–10 = half (rounded),
 * child 1–5 = free. The server is authoritative; this is for display only.
 */
export function fareForSeatedType(type: SeatedType, seatFareKobo: number): number {
  return type === "child_6_10" ? Math.round(seatFareKobo / 2) : seatFareKobo;
}
