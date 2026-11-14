import { NextResponse, type NextRequest } from "next/server";

import { buildAgreementPdf } from "@/lib/agreements/pdf";
import { createClient } from "@/lib/supabase/server";

function fmt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS limits this to the vendor's owner/manager or a platform admin.
  const { data: va } = await supabase
    .from("vendor_agreements")
    .select(
      "vendor_signature, vendor_signer_name, vendor_signed_at, admin_signature, admin_signer_name, admin_signed_at, status, agreements(version, content), vendors(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!va) return NextResponse.json({ error: "not found" }, { status: 404 });
  const agreement = va.agreements as unknown as {
    version: number;
    content: { title: string; body: string }[];
  } | null;
  const vendor = va.vendors as unknown as { name: string } | null;
  if (!agreement) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pdf = await buildAgreementPdf({
    title: "Countribus Partner Agreement",
    versionLabel:
      va.status === "countersigned"
        ? `Version ${agreement.version} · fully signed`
        : `Version ${agreement.version} · awaiting counter-signature`,
    clauses: agreement.content,
    parties: [
      {
        role: "Operator",
        name: va.vendor_signer_name ?? vendor?.name ?? "Operator",
        signedAt: fmt(va.vendor_signed_at),
        signature: va.vendor_signature,
      },
      {
        role: "Countribus",
        name: va.admin_signer_name ?? "Countribus",
        signedAt: fmt(va.admin_signed_at),
        signature: va.admin_signature,
      },
    ],
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="countribus-partner-agreement-v${agreement.version}.pdf"`,
    },
  });
}
