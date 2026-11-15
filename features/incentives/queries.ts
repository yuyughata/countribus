import "server-only";

import { createClient } from "@/lib/supabase/server";

export type IncentiveRule = {
  id: string;
  staff_id: string | null;
  kind: "fixed" | "percent";
  fixed_kobo: number | null;
  rate_bps: number | null;
};

export type StaffIncentiveRow = {
  userId: string;
  name: string;
  role: string;
  override: IncentiveRule | null;
  salesCount: number;
  grossSoldKobo: number;
  pendingKobo: number;
  paidKobo: number;
};

export type IncentivesData = {
  defaultRule: IncentiveRule | null;
  staff: StaffIncentiveRow[];
};

/** Everything the incentives console needs for one vendor. */
export async function getIncentivesData(vendorId: string): Promise<IncentivesData> {
  const supabase = await createClient();

  const [{ data: rules }, { data: staff }, { data: perf }] = await Promise.all([
    supabase
      .from("staff_incentive_rules")
      .select("id, staff_id, kind, fixed_kobo, rate_bps")
      .eq("vendor_id", vendorId)
      .is("effective_to", null),
    supabase.rpc("vendor_staff_list", { p_vendor: vendorId }),
    supabase.rpc("staff_sales_performance", { p_vendor: vendorId }),
  ]);

  const ruleRows = (rules ?? []) as IncentiveRule[];
  const defaultRule = ruleRows.find((r) => r.staff_id === null) ?? null;
  const overrideByStaff = new Map(
    ruleRows.filter((r) => r.staff_id).map((r) => [r.staff_id as string, r]),
  );

  const perfByStaff = new Map(
    ((perf ?? []) as {
      staff_id: string;
      sales_count: number;
      gross_sold_kobo: number;
      incentive_pending_kobo: number;
      incentive_paid_kobo: number;
    }[]).map((p) => [p.staff_id, p]),
  );

  const staffRows = (staff ?? []) as {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    is_active: boolean;
  }[];

  const rows: StaffIncentiveRow[] = staffRows
    .filter((s) => s.is_active)
    .map((s) => {
      const p = perfByStaff.get(s.user_id);
      return {
        userId: s.user_id,
        name: s.full_name || s.email || "Staff",
        role: s.role,
        override: overrideByStaff.get(s.user_id) ?? null,
        salesCount: p?.sales_count ?? 0,
        grossSoldKobo: p?.gross_sold_kobo ?? 0,
        pendingKobo: p?.incentive_pending_kobo ?? 0,
        paidKobo: p?.incentive_paid_kobo ?? 0,
      };
    });

  return { defaultRule, staff: rows };
}
