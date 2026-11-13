import "server-only";

import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/context";
import { userHasCapability } from "@/lib/permissions/dashboard-nav";
import type { Capability } from "@/lib/permissions/roles";
import type { AuthContext } from "@/lib/auth/access";

/**
 * Page-level guard for dashboard routes: redirects unauthenticated users to
 * /login and users who lack the capability back to /dashboard. This is
 * defence-in-depth on top of RLS — a hidden menu item is never the only guard.
 */
export async function requireDashboardCapability(cap: Capability): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!userHasCapability(ctx, cap)) redirect("/dashboard");
  return ctx;
}
