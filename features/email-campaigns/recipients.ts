import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const MANAGER_ROLES = ["vendor_owner", "vendor_manager"];

/**
 * Resolve the set of recipient email addresses for the chosen audience segments
 * plus any explicit extra emails. De-duplicated and lower-cased. Reads all
 * profiles with the service-role client (admin-only feature).
 */
export async function resolveRecipients(
  audiences: string[],
  extra: string[] = [],
): Promise<string[]> {
  const set = new Set<string>();
  // Explicit emails always resolve; audience segments need the service role.
  for (const e of extra) {
    const v = e.trim().toLowerCase();
    if (v.includes("@")) set.add(v);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || audiences.length === 0) {
    return [...set];
  }

  const admin = createAdminClient();
  const wantAll = audiences.includes("everyone");

  const [{ data: profiles }, { data: staff }] = await Promise.all([
    admin.from("profiles").select("id, email, is_platform_admin"),
    admin.from("vendor_staff").select("user_id, role").eq("is_active", true),
  ]);

  const staffIds = new Set((staff ?? []).map((s) => s.user_id));
  const managerIds = new Set(
    (staff ?? []).filter((s) => MANAGER_ROLES.includes(s.role)).map((s) => s.user_id),
  );

  for (const p of profiles ?? []) {
    const email = p.email;
    if (!email) continue;
    const isStaff = staffIds.has(p.id);
    const isManager = managerIds.has(p.id);
    const isAdmin = Boolean(p.is_platform_admin);
    const isCustomer = !isStaff && !isAdmin;

    const want =
      wantAll ||
      (audiences.includes("customers") && isCustomer) ||
      (audiences.includes("vendor_managers") && isManager) ||
      (audiences.includes("all_staff") && isStaff) ||
      (audiences.includes("team") && isAdmin);

    if (want) set.add(email.toLowerCase());
  }

  return [...set];
}
