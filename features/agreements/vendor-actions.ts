"use server";

import { revalidatePath } from "next/cache";

import { firstManageableVendorId, requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { buildAgreementPdf } from "@/lib/agreements/pdf";
import { emailShell } from "@/lib/notifications/email-layout";
import { sendEmail } from "@/lib/notifications/email";
import { getCurrentAgreement } from "@/features/agreements/queries";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

function validSignature(s: string): boolean {
  return s.startsWith("data:image/png;base64,") && s.length > 200;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Operator signs the current Partner Agreement. */
export async function signPartnerAgreement(
  signature: string,
  signerName: string,
  vendorIdArg?: string,
): Promise<Result> {
  const ctx = await requireUser();
  const vendorId = ctx.isPlatformAdmin && vendorIdArg ? vendorIdArg : firstManageableVendorId(ctx);
  if (!vendorId) return { ok: false, error: "No operator to sign for" };
  if (!signerName.trim()) return { ok: false, error: "Enter the signatory's full name" };
  if (!validSignature(signature)) return { ok: false, error: "Please add your signature" };

  const current = await getCurrentAgreement("partner");
  if (!current) return { ok: false, error: "No agreement is published yet" };

  const supabase = await createClient();
  const { error } = await supabase.from("vendor_agreements").upsert(
    {
      vendor_id: vendorId,
      agreement_id: current.id,
      vendor_signature: signature,
      vendor_signer_name: signerName.trim(),
      vendor_signed_at: new Date().toISOString(),
      status: "vendor_signed",
      admin_signature: null,
      admin_signer_name: null,
      admin_signed_at: null,
      admin_signed_by: null,
    },
    { onConflict: "vendor_id,agreement_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/agreement");
  revalidatePath("/dashboard/agreements/partner");
  return { ok: true, message: "Signed. Awaiting Countribus counter-signature." };
}

/** Platform admin counter-signs an operator's signature, completing the agreement. */
export async function countersignAgreement(
  id: string,
  signature: string,
  signerName: string,
): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Only a platform admin can counter-sign" };
  if (!signerName.trim()) return { ok: false, error: "Enter your name" };
  if (!validSignature(signature)) return { ok: false, error: "Please add your signature" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_agreements")
    .update({
      admin_signature: signature,
      admin_signer_name: signerName.trim(),
      admin_signed_at: new Date().toISOString(),
      admin_signed_by: ctx.userId,
      status: "countersigned",
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await emailSignedAgreement(id).catch(() => {});
  revalidatePath("/dashboard/agreements/partner");
  return { ok: true, message: "Counter-signed. A signed copy was emailed to the operator." };
}

/** Build the signed-agreement PDF and email it to the operator (best-effort). */
async function emailSignedAgreement(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: va } = await supabase
    .from("vendor_agreements")
    .select(
      "vendor_id, agreement_id, vendor_signature, vendor_signer_name, vendor_signed_at, admin_signature, admin_signer_name, admin_signed_at, agreements(version, content, published_at), vendors(name, contact_email)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!va) return;
  const agreement = va.agreements as unknown as {
    version: number;
    content: { title: string; body: string }[];
    published_at: string;
  } | null;
  const vendor = va.vendors as unknown as { name: string; contact_email: string | null } | null;
  if (!agreement || !vendor?.contact_email) return;

  const pdf = await buildAgreementPdf({
    title: "Countribus Partner Agreement",
    versionLabel: `Version ${agreement.version} · signed ${fmtDate(va.admin_signed_at)}`,
    clauses: agreement.content,
    parties: [
      {
        role: "Operator",
        name: va.vendor_signer_name ?? vendor.name,
        signedAt: fmtDate(va.vendor_signed_at),
        signature: va.vendor_signature,
      },
      {
        role: "Countribus",
        name: va.admin_signer_name ?? "Countribus",
        signedAt: fmtDate(va.admin_signed_at),
        signature: va.admin_signature,
      },
    ],
  });
  const base64 = Buffer.from(pdf).toString("base64");

  await sendEmail({
    to: vendor.contact_email,
    subject: `Your Countribus Partner Agreement (v${agreement.version}) — fully signed`,
    text: `Your Partner Agreement with Countribus is now fully signed by both parties. A PDF copy is attached, and it is always available on your dashboard.`,
    html: emailShell({
      heading: "Partner Agreement signed ✅",
      intro: `Your Partner Agreement with Countribus (version ${agreement.version}) is now fully signed by both parties.`,
      bodyHtml: `<p style="font-size:15px;line-height:1.55;color:#3d2a30">A PDF copy is attached for your records, and it's always available to download from your dashboard under Agreements.</p>`,
    }),
    attachments: [
      { filename: `countribus-partner-agreement-v${agreement.version}.pdf`, content: base64 },
    ],
  });
}
