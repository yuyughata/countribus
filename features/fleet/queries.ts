import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"] & {
  vehicle_categories: { name: string; key: string } | null;
};

export type CategoryRow = Database["public"]["Tables"]["vehicle_categories"]["Row"];

export async function listVehicles(): Promise<VehicleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*, vehicle_categories(name, key)")
    .order("created_at", { ascending: false });
  // Cast via unknown: the FK embed resolves at runtime; the generated types omit
  // Relationships metadata, so TS can't infer the embedded shape.
  return (data ?? []) as unknown as VehicleRow[];
}

export async function listCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicle_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function listSeatTemplates(vehicleId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seat_templates")
    .select("id, name, version, rows, columns, is_published, created_at")
    .eq("vehicle_id", vehicleId)
    .order("version", { ascending: false });
  return data ?? [];
}
