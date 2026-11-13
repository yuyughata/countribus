import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type VendorRow = Pick<
  Database["public"]["Tables"]["vendors"]["Row"],
  "id" | "name" | "slug" | "status" | "contact_email" | "contact_phone" | "created_at"
>;

/**
 * List vendors visible to the current user. RLS scopes this automatically:
 * a platform admin sees all; a vendor member sees their own; everyone sees
 * approved vendors. No manual branching needed — the database decides.
 */
export async function listVisibleVendors(): Promise<VendorRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("id, name, slug, status, contact_email, contact_phone, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
