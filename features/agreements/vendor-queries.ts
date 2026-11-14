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
