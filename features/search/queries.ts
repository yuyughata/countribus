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
