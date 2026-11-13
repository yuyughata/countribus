import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getScheduleForBooking(scheduleId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedules")
    .select(
      "id, status, departure_at, arrival_estimate_at, base_fare_kobo, currency, vendors(name), origin:origin_terminal_id(name), destination:destination_terminal_id(name)",
    )
    .eq("id", scheduleId)
    .maybeSingle();
  return data as unknown as {
    id: string;
    status: string;
    departure_at: string;
    arrival_estimate_at: string | null;
    base_fare_kobo: number | null;
    currency: string;
    vendors: { name: string } | null;
    origin: { name: string } | null;
    destination: { name: string } | null;
  } | null;
}

export type SeatCell = {
  seat_id: string;
  seat_label: string;
  state: "available" | "booked" | "held" | "blocked";
  held_until: string | null;
  surcharge_kobo: number;
};

export async function getSeatMap(scheduleId: string): Promise<SeatCell[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_seats")
    .select("seat_id, seat_label, state, held_until, surcharge_kobo")
    .eq("schedule_id", scheduleId)
    .order("seat_label");
  return (data ?? []) as SeatCell[];
}
