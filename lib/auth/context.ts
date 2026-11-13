import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { AuthContext } from "@/lib/auth/access";

export type { AuthContext, VendorMembership } from "@/lib/auth/access";
export { roleForVendor, canForVendor, canPlatform, hasVendorAccess } from "@/lib/auth/access";

export class AuthError extends Error {
  constructor(
    public code: "unauthenticated" | "forbidden",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AuthError";
  }
}

/**
 * Resolve the current user's auth context from the Supabase session:
 * profile (platform-admin flag) + active vendor memberships. Returns null when
 * not signed in. Reads go through RLS — a user only ever sees their own rows.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: staff }] = await Promise.all([
    supabase.from("profiles").select("is_platform_admin, email").eq("id", user.id).maybeSingle(),
    supabase
      .from("vendor_staff")
      .select("vendor_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    isPlatformAdmin: profile?.is_platform_admin ?? false,
    memberships: (staff ?? []).map((s) => ({ vendorId: s.vendor_id, role: s.role })),
  };
}

/** Require an authenticated user or throw AuthError("unauthenticated"). */
export async function requireUser(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new AuthError("unauthenticated");
  return ctx;
}
