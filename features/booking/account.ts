import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listMyBookings(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, reference, status, grand_total_kobo, passenger_count, created_at, schedules(departure_at)",
    )
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as {
    id: string;
    reference: string;
    status: string;
    grand_total_kobo: number;
    passenger_count: number;
    created_at: string;
    schedules: { departure_at: string } | null;
  }[];
}

export async function getBookingByReference(reference: string) {
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, reference, status, grand_total_kobo, contact_name, contact_phone, contact_email, schedule_id, vendors(name, contact_phone), schedules(departure_at, boarding_address, boarding_contact_phone, origin:origin_terminal_id(name, address), destination:destination_terminal_id(name))",
    )
    .eq("reference", reference)
    .maybeSingle();
  if (!booking) return null;

  const { data: bps } = await supabase
    .from("booking_passengers")
    .select("passenger_id, seat_label, fare_kobo, boarding_status, passenger_type, passengers(full_name)")
    .eq("booking_id", (booking as { id: string }).id);

  const { data: tickets } = await supabase
    .from("ticket_documents")
    .select("id, passenger_id, qr_token, status")
    .eq("booking_id", (booking as { id: string }).id);

  return {
    booking: booking as unknown as {
      id: string;
      reference: string;
      status: string;
      grand_total_kobo: number;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      schedule_id: string;
      vendors: { name: string; contact_phone: string | null } | null;
      schedules: {
        departure_at: string;
        boarding_address: string | null;
        boarding_contact_phone: string | null;
        origin: { name: string; address: string | null } | null;
        destination: { name: string } | null;
      } | null;
    },
    passengers: (bps ?? []) as unknown as {
      passenger_id: string;
      seat_label: string | null;
      fare_kobo: number;
      boarding_status: string;
      passenger_type: "adult" | "child_1_5" | "child_6_10";
      passengers: { full_name: string } | null;
    }[],
    tickets: (tickets ?? []) as {
      id: string;
      passenger_id: string;
      qr_token: string;
      status: string;
    }[],
  };
}
