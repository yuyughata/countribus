import { can, type Capability, type Role } from "@/lib/permissions/roles";
import type { VendorRole } from "@/lib/supabase/database.types";

/**
 * Pure authorization helpers over a resolved auth context.
 *
 * No I/O — unit-testable. The context is produced by `lib/auth/context.ts`
 * (server-only) and these functions decide what it may do. This is the
 * server-side check layer; it sits alongside (never replaces) database RLS.
 */

export interface VendorMembership {
  vendorId: string;
  role: VendorRole;
}

export interface AuthContext {
  userId: string;
  email: string | null;
  isPlatformAdmin: boolean;
  memberships: VendorMembership[];
}

/**
 * The effective role when acting on a given vendor. Platform admins act as
 * `super_admin`; otherwise it's the user's active membership role, or null if
 * they have no access to that vendor.
 */
export function roleForVendor(ctx: AuthContext, vendorId: string): Role | null {
  if (ctx.isPlatformAdmin) return "super_admin";
  const m = ctx.memberships.find((x) => x.vendorId === vendorId);
  return m ? m.role : null;
}

/** Does the context hold a capability when acting on a specific vendor? */
export function canForVendor(ctx: AuthContext, vendorId: string, capability: Capability): boolean {
  const role = roleForVendor(ctx, vendorId);
  return role ? can(role, capability) : false;
}

/** Platform-level capability (super admin only). */
export function canPlatform(ctx: AuthContext, capability: Capability): boolean {
  return ctx.isPlatformAdmin && can("super_admin", capability);
}

/** Is the user a member of (or admin over) the vendor at all? */
export function hasVendorAccess(ctx: AuthContext, vendorId: string): boolean {
  return ctx.isPlatformAdmin || ctx.memberships.some((m) => m.vendorId === vendorId);
}
