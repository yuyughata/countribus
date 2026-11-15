import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  author_kind: string;
  vendor_id: string | null;
  booking_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketMessage = {
  id: string;
  body: string;
  is_admin: boolean;
  author_id: string | null;
  created_at: string;
};

export type VendorHealth = {
  vendor_id: string;
  vendor_name: string;
  avg_rating: number;
  review_count: number;
  complaint_count: number;
  open_complaints: number;
  flagged: boolean;
};

const TICKET_COLS =
  "id, subject, category, status, author_kind, vendor_id, booking_id, created_by, created_at, updated_at";

/** The signed-in user's own tickets. */
export async function listMyTickets(): Promise<Ticket[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("support_tickets")
    .select(TICKET_COLS)
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Ticket[];
}

/** All tickets (RLS returns all only to a platform admin). */
export async function listAllTickets(): Promise<Ticket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select(TICKET_COLS)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Ticket[];
}

/** Display names for a set of user ids (admin-scoped via RLS on profiles). */
export async function namesByUserId(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", unique);
  const map: Record<string, string> = {};
  for (const p of data ?? []) map[p.id] = p.full_name || p.email || "User";
  return map;
}

/** Admin flag view: per-operator rating + complaint counts. */
export async function listVendorHealth(): Promise<VendorHealth[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("vendor_health");
  return (data ?? []) as VendorHealth[];
}
