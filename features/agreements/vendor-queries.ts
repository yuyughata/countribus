import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAgreement, type AgreementVersion } from "@/features/agreements/queries";

export type VendorAgreementRecord = {
  id: string;
  status: string;
  agreement_id: string;
  vendor_signer_name: string | null;
  vendor_signed_at: string | null;
  admin_signer_name: string | null;
  admin_signed_at: string | null;
};

export type VendorAgreementState = {
  current: AgreementVersion | null;
  record: VendorAgreementRecord | null; // acceptance for the CURRENT version
  outstanding: boolean; // current version not yet signed
};

/** The operator's standing with the current Partner Agreement. */
export async function getVendorAgreementState(vendorId: string): Promise<VendorAgreementState> {
  const current = await getCurrentAgreement("partner");
  if (!current) return { current: null, record: null, outstanding: false };
  const supabase = await createClient();
  const { data: record } = await supabase
    .from("vendor_agreements")
    .select(
      "id, status, agreement_id, vendor_signer_name, vendor_signed_at, admin_signer_name, admin_signed_at",
    )
    .eq("vendor_id", vendorId)
    .eq("agreement_id", current.id)
    .maybeSingle();
  return {
    current,
    record: (record as VendorAgreementRecord | null) ?? null,
    outstanding: !record,
  };
}

export type PartnerAnnounceState = {
  current: AgreementVersion | null;
  announcedAt: string | null; // when operators were last notified for this version
  operatorCount: number; // approved operators
  signedCount: number; // operators who have signed THIS version
};

/**
 * Admin view of whether operators have been notified about the current Partner
 * Agreement version, and how many have signed it. Used to drive the "Notify
 * operators" control so we notify once per version instead of per clause edit.
 */
export async function getPartnerAnnounceState(): Promise<PartnerAnnounceState> {
  const current = await getCurrentAgreement("partner");
  if (!current) return { current: null, announcedAt: null, operatorCount: 0, signedCount: 0 };
  const supabase = await createClient();
  const [{ data: row }, { count: operatorCount }, { count: signedCount }] = await Promise.all([
    supabase.from("agreements").select("announced_at").eq("id", current.id).maybeSingle(),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase
      .from("vendor_agreements")
      .select("id", { count: "exact", head: true })
      .eq("agreement_id", current.id),
  ]);
  return {
    current,
    announcedAt: (row as { announced_at: string | null } | null)?.announced_at ?? null,
    operatorCount: operatorCount ?? 0,
    signedCount: signedCount ?? 0,
  };
}

export type PendingCountersignature = {
  id: string;
  vendor_id: string;
  vendor_signer_name: string | null;
  vendor_signed_at: string | null;
  vendors: { name: string } | null;
  agreements: { version: number } | null;
};

/** Vendor signatures awaiting the platform counter-signature (admin). */
export async function listPendingCountersignatures(): Promise<PendingCountersignature[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_agreements")
    .select(
      "id, vendor_id, vendor_signer_name, vendor_signed_at, vendors(name), agreements(version)",
    )
    .eq("status", "vendor_signed")
    .order("vendor_signed_at", { ascending: true });
  return (data ?? []) as unknown as PendingCountersignature[];
}
