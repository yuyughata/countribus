import type { AuthContext } from "@/lib/auth/access";
import { can, type Capability, type Role } from "@/lib/permissions/roles";

/**
 * Which capability each dashboard route requires to appear in the nav and be
 * reachable. `null` = always visible (every signed-in user). This drives menu
 * visibility AND the per-page guard, so a menu item is shown only when the
 * account can actually use the page it points to.
 */
export const DASHBOARD_NAV_CAP: Record<string, Capability | null> = {
  "/dashboard": null,
  "/dashboard/vendors": "vendor:approve",
  "/dashboard/fleet": "vehicle:manage",
  "/dashboard/routes": "route:manage",
  "/dashboard/schedules": "schedule:manage",
  "/dashboard/finance": "finance:view",
  "/dashboard/reports": "finance:view",
  "/dashboard/manifests": "manifest:view",
  "/dashboard/security": "platform:manage",
  "/dashboard/homepage": "platform:manage",
  "/dashboard/promotions": "platform:manage",
  "/dashboard/communications": "platform:manage",
  "/dashboard/agreements": "platform:manage",
  "/dashboard/activity": "audit:view",
  "/dashboard/permissions": "staff:manage",
  "/dashboard/settings": "vendor:manage_own",
  "/dashboard/profile": null,
};

/** Does the user hold a capability through platform-admin or any membership? */
export function userHasCapability(ctx: AuthContext, cap: Capability): boolean {
  if (ctx.isPlatformAdmin) return true;
  return ctx.memberships.some((m) => can(m.role as Role, cap));
}

/** Can the user reach a dashboard href? */
export function canAccessHref(ctx: AuthContext, href: string): boolean {
  const cap = DASHBOARD_NAV_CAP[href];
  if (!cap) return true;
  return userHasCapability(ctx, cap);
}

/** All dashboard hrefs this user may see/visit. */
export function allowedDashboardHrefs(ctx: AuthContext): string[] {
  return Object.keys(DASHBOARD_NAV_CAP).filter((h) => canAccessHref(ctx, h));
}
