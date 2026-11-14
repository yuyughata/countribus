import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TerminalOption = { id: string; label: string };

export async function listTerminalOptionsPublic(): Promise<TerminalOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("terminals")
    .select("id, name, cities(name)")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((t) => {
    const c = t.cities as unknown as { name: string } | null;
    return { id: t.id, label: c ? `${t.name} — ${c.name}` : t.name };
  });
}

export type PopularRoute = {
  schedule_id: string;
  vendor_name: string;
  origin_city: string;
  destination_city: string;
  origin_terminal: string;
  destination_terminal: string;
  departure_at: string;
  base_fare_kobo: number | null;
  available_seats: number;
  frequency: number;
};

/**
 * Popular routes for the homepage slider — one card per route (the soonest
 * bookable upcoming departure), ordered by how frequently the corridor runs.
 */
export async function listPopularRoutes(limit = 8): Promise<PopularRoute[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_popular_routes", { p_limit: limit });
  if (error) return [];
  return (data ?? []) as PopularRoute[];
}

export type JourneyResult = {
  schedule_id: string;
  vendor_name: string;
  origin_name: string;
  destination_name: string;
  departure_at: string;
  arrival_estimate_at: string | null;
  base_fare_kobo: number | null;
  category_key: string | null;
  available_seats: number;
};

export async function searchJourneys(params: {
  origin: string;
  dest: string;
  date: string;
  pax: number;
  category?: string;
}): Promise<JourneyResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_journeys", {
    p_origin: params.origin,
    p_dest: params.dest,
    p_date: params.date,
    p_pax: params.pax,
    p_category: params.category && params.category !== "any" ? params.category : undefined,
  });
  if (error) return [];
  return (data ?? []) as JourneyResult[];
}

/**
 * "Other routes" shown below the exact results: upcoming bookable departures
 * from the same origin (same-destination other dates first, then other
 * destinations), excluding the exact (origin, destination, date) already shown.
 */
export async function searchAlternativeJourneys(params: {
  origin: string;
  dest: string;
  date: string;
  pax: number;
}): Promise<JourneyResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_alternative_journeys", {
    p_origin: params.origin,
    p_dest: params.dest,
    p_date: params.date,
    p_pax: params.pax,
  });
  if (error) return [];
  return (data ?? []) as JourneyResult[];
}
