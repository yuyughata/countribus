import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ReconSummary = {
  online_bookings: number;
  online_revenue_kobo: number;
  walkin_bookings: number;
  walkin_revenue_kobo: number;
  total_bookings: number;
  total_revenue_kobo: number;
  passengers: number;
  commission_kobo: number;
  vendor_net_kobo: number;
  unreconciled: number;
};

export type ReconVehicle = {
  vehicle_id: string;
  registration_no: string;
  display_name: string | null;
  departures: number;
  passengers: number;
  capacity: number;
};

export type ReconUnreconciled = {
  reference: string;
  provider: string;
  amount_kobo: number;
  payment_status: string;
  booking_status: string;
  verified_at: string;
};

export type ReconStaff = {
  staff_id: string;
  staff_name: string;
  sales_count: number;
  gross_sold_kobo: number;
  incentive_pending_kobo: number;
  incentive_paid_kobo: number;
  incentive_total_kobo: number;
};

export type ReconciliationData = {
  summary: ReconSummary;
  vehicles: ReconVehicle[];
  unreconciled: ReconUnreconciled[];
  staff: ReconStaff[];
};

const EMPTY_SUMMARY: ReconSummary = {
  online_bookings: 0,
  online_revenue_kobo: 0,
  walkin_bookings: 0,
  walkin_revenue_kobo: 0,
  total_bookings: 0,
  total_revenue_kobo: 0,
  passengers: 0,
  commission_kobo: 0,
  vendor_net_kobo: 0,
  unreconciled: 0,
};

/**
 * Daily reconciliation for one vendor (vendorId set) or platform-wide
 * (vendorId null, admin only). Per-vehicle loads and staff performance are
 * vendor-scoped, so they are empty in the platform-wide view.
 */
export async function getReconciliationData(
  vendorId: string | null,
  date: string,
): Promise<ReconciliationData> {
  const supabase = await createClient();

  const [summaryRes, unrecRes] = await Promise.all([
    supabase.rpc("reconciliation_summary", { p_vendor: vendorId, p_date: date }),
    supabase.rpc("reconciliation_unreconciled", { p_vendor: vendorId, p_date: date }),
  ]);

  let vehicles: ReconVehicle[] = [];
  let staff: ReconStaff[] = [];
  if (vendorId) {
    const [vehRes, staffRes] = await Promise.all([
      supabase.rpc("reconciliation_vehicles", { p_vendor: vendorId, p_date: date }),
      supabase.rpc("staff_sales_performance", { p_vendor: vendorId }),
    ]);
    vehicles = (vehRes.data ?? []) as ReconVehicle[];
    staff = (staffRes.data ?? []) as ReconStaff[];
  }

  const summary = ((summaryRes.data ?? [])[0] as ReconSummary | undefined) ?? EMPTY_SUMMARY;
  const unreconciled = (unrecRes.data ?? []) as ReconUnreconciled[];

  return { summary, vehicles, unreconciled, staff };
}
