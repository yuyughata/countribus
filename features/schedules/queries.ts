import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TerminalOption = { id: string; label: string };

export async function listTerminalOptions(): Promise<TerminalOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("terminals")
    .select("id, name, cities(name, states(code))")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((t) => {
    const c = t.cities as unknown as { name: string; states: { code: string } | null } | null;
    return { id: t.id, label: c ? `${t.name} — ${c.name}` : t.name };
  });
}

export async function listRoutes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routes")
    .select("id, name, origin:origin_terminal_id(name), destination:destination_terminal_id(name)")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as {
    id: string;
    name: string;
    origin: { name: string } | null;
    destination: { name: string } | null;
  }[];
}

export async function listManageableVehicleOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("id, registration_no, display_name, status")
    .eq("status", "active")
    .order("registration_no");
  return data ?? [];
}

export async function listSchedulesForConsole() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedules")
    .select(
      "id, status, departure_at, arrival_estimate_at, base_fare_kobo, capacity, routes(name), origin:origin_terminal_id(name), destination:destination_terminal_id(name)",
    )
    .order("departure_at", { ascending: true });
  return (data ?? []) as unknown as {
    id: string;
    status: string;
    departure_at: string;
    arrival_estimate_at: string | null;
    base_fare_kobo: number | null;
    capacity: number | null;
    routes: { name: string } | null;
    origin: { name: string } | null;
    destination: { name: string } | null;
  }[];
}
