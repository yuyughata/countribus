import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { VendorRole } from "@/lib/supabase/database.types";

export type TeamMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: VendorRole;
  is_active: boolean;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: VendorRole;
  created_at: string;
  expires_at: string;
};

/** Active + inactive staff for a vendor (RLS-checked RPC, owner/manager only). */
export async function listTeam(vendorId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("vendor_staff_list", { p_vendor: vendorId });
  return (data ?? []) as TeamMember[];
}

/** Pending (unaccepted) invitations for a vendor. */
export async function listPendingInvites(vendorId: string): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_invitations")
    .select("id, email, role, created_at, expires_at")
    .eq("vendor_id", vendorId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as PendingInvite[];
}
