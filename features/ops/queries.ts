import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listDepartures() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedules")
    .select(
      "id, status, departure_at, capacity, routes(name), origin:origin_terminal_id(name), destination:destination_terminal_id(name)",
    )
    .in("status", ["published", "departed", "completed"])
    .order("departure_at", { ascending: true });
  return (data ?? []) as unknown as {
    id: string;
    status: string;
    departure_at: string;
    capacity: number | null;
    routes: { name: string } | null;
    origin: { name: string } | null;
    destination: { name: string } | null;
  }[];
}

export type ManifestRow = {
  id: string;
  seat_label: string | null;
  boarding_status: string;
  passenger_type: "adult" | "child_1_5" | "child_6_10";
  passengers: { full_name: string } | null;
  bookings: { reference: string; contact_phone: string; status: string } | null;
  luggage_items: { count: number }[];
};

export async function getManifest(scheduleId: string) {
  const supabase = await createClient();
  const { data: schedule } = await supabase
    .from("schedules")
    .select(
      "id, departure_at, status, routes(name), origin:origin_terminal_id(name), destination:destination_terminal_id(name)",
    )
    .eq("id", scheduleId)
    .maybeSingle();

  const { data: rows } = await supabase
    .from("booking_passengers")
    .select(
      "id, seat_label, boarding_status, passenger_type, passengers(full_name), bookings!inner(reference, contact_phone, status), luggage_items(count)",
    )
    .eq("schedule_id", scheduleId)
    .eq("bookings.status", "paid")
    .order("seat_label", { nullsFirst: false });

  return {
    schedule: schedule as unknown as {
      id: string;
      departure_at: string;
      status: string;
      routes: { name: string } | null;
      origin: { name: string } | null;
      destination: { name: string } | null;
    } | null,
    rows: (rows ?? []) as unknown as ManifestRow[],
  };
}
