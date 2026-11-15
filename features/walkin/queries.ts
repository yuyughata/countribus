import "server-only";

import { createClient } from "@/lib/supabase/server";

export type WalkinSchedule = {
  id: string;
  vendor_id: string;
  vendor_name: string | null;
  departure_at: string;
  base_fare_kobo: number | null;
  route: string | null;
  origin: string | null;
  destination: string | null;
  available: number;
};

/**
 * Upcoming published departures the signed-in staff member's vendor(s) operate,
 * with a live available-seat count. RLS already scopes `schedules` to the
 * caller's vendor memberships, so this only ever returns their own trips.
 */
export async function listWalkinSchedules(): Promise<WalkinSchedule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedules")
    .select(
      "id, vendor_id, departure_at, base_fare_kobo, vendors(name), routes(name), origin:origin_terminal_id(name), destination:destination_terminal_id(name)",
    )
    .eq("status", "published")
    .gte("departure_at", new Date().toISOString())
    .order("departure_at", { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    vendor_id: string;
    departure_at: string;
    base_fare_kobo: number | null;
    vendors: { name: string } | null;
    routes: { name: string } | null;
    origin: { name: string } | null;
    destination: { name: string } | null;
  }[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: seats } = await supabase
    .from("schedule_seats")
    .select("schedule_id, state")
    .in("schedule_id", ids);
  const avail = new Map<string, number>();
  for (const s of (seats ?? []) as { schedule_id: string; state: string }[]) {
    if (s.state === "available") avail.set(s.schedule_id, (avail.get(s.schedule_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    id: r.id,
    vendor_id: r.vendor_id,
    vendor_name: r.vendors?.name ?? null,
    departure_at: r.departure_at,
    base_fare_kobo: r.base_fare_kobo,
    route: r.routes?.name ?? null,
    origin: r.origin?.name ?? null,
    destination: r.destination?.name ?? null,
    available: avail.get(r.id) ?? 0,
  }));
}
