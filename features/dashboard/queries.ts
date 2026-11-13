import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/lib/auth/access";
import { firstManageableVendorId } from "@/lib/auth/access";

export type AdminMetrics = {
  gross_booking_kobo: number;
  commission_kobo: number;
  bookings_paid: number;
  active_trips: number;
  vendors: number;
  passengers: number;
};

export type VendorMetrics = {
  gross_booking_kobo: number;
  net_kobo: number;
  bookings_paid: number;
  upcoming_trips: number;
  vehicles: number;
};

export async function getAdminDashboard() {
  const supabase = await createClient();
  const [{ data: metrics }, { data: revenue }, { data: pending }, { data: activity }] =
    await Promise.all([
      supabase.rpc("admin_dashboard_metrics"),
      supabase.rpc("admin_revenue_by_month"),
      supabase.from("vendors").select("id, name, status, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
      supabase.from("audit_logs").select("action, entity, metadata, created_at").order("created_at", { ascending: false }).limit(6),
    ]);
  return {
    metrics: (metrics ?? null) as AdminMetrics | null,
    revenue: (revenue ?? []) as { month: string; gross_kobo: number }[],
    pending: (pending ?? []) as { id: string; name: string; status: string; created_at: string }[],
    activity: (activity ?? []) as {
      action: string;
      entity: string;
      metadata: Record<string, unknown>;
      created_at: string;
    }[],
  };
}

export async function getVendorDashboard(vendorId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("vendor_dashboard_metrics", { p_vendor: vendorId });
  return (data ?? null) as VendorMetrics | null;
}

export function dashboardMode(ctx: AuthContext): { mode: "admin" } | { mode: "vendor"; vendorId: string } | { mode: "none" } {
  if (ctx.isPlatformAdmin) return { mode: "admin" };
  const v = firstManageableVendorId(ctx);
  return v ? { mode: "vendor", vendorId: v } : { mode: "none" };
}
