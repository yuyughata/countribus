"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CheckCircle2, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldClass, labelClass } from "@/components/ui/field";
import { SignaturePad } from "@/components/dashboard/agreements/signature-pad";
import { signPartnerAgreement } from "@/features/agreements/vendor-actions";
import type { VendorAgreementState } from "@/features/agreements/vendor-queries";

function paras(body: string) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function AgreementSigner({ state }: { state: VendorAgreementState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!state.current) {
    return <Card className="text-muted p-6 text-sm">No Partner Agreement is published yet.</Card>;
  }

  const record = state.record;
  const countersigned = record?.status === "countersigned";
  const signedPendingAdmin = record?.status === "vendor_signed";
  const needsAction = state.outstanding;

  function sign() {
    setMsg(null);
    if (!signature) {
      setMsg({ ok: false, text: "Please add your signature." });
      return;
    }
    start(async () => {
      const r = await signPartnerAgreement(signature!, name);
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Signed.") : r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {needsAction && (
        <div className="bg-warning-soft text-warning flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm">
          <span>
            Please review the current Partner Agreement (v{state.current.version}) and sign it to
            keep selling on Countribus.
          </span>
          <Badge tone="warning">Action needed</Badge>
        </div>
      )}

      {/* Agreement text */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="font-display text-foreground text-xl font-semibold">
              Countribus Partner Agreement
            </h2>
            <p className="text-subtle text-xs">
              Version {state.current.version} · published{" "}
              {new Date(state.current.published_at).toLocaleDateString("en-NG")}
            </p>
          </div>
          {state.current.content.map((c, i) => (
            <div key={i}>
              <h3 className="text-foreground text-sm font-semibold">
                {i + 1}. {c.title}
              </h3>
              <div className="text-muted mt-1 space-y-2 text-sm leading-relaxed">
                {paras(c.body).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Status / action */}
      {countersigned ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="text-success size-5" />
              <span>
                <span className="text-foreground font-medium">Fully signed.</span>{" "}
                <span className="text-muted">
                  You signed as {record?.vendor_signer_name} on{" "}
                  {record?.vendor_signed_at &&
                    new Date(record.vendor_signed_at).toLocaleDateString("en-NG")}
                  ; counter-signed by Countribus.
                </span>
              </span>
            </div>
            <a href={`/api/agreements/${record!.id}/pdf`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="size-4" /> Download PDF
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : signedPendingAdmin ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="text-sm">
              <span className="text-foreground font-medium">Signed — awaiting Countribus.</span>{" "}
              <span className="text-muted">
                You signed as {record?.vendor_signer_name}. We&apos;ll counter-sign and email you a
                copy shortly.
              </span>
            </div>
            <a href={`/api/agreements/${record!.id}/pdf`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="size-4" /> Download PDF
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="text-foreground font-semibold">Sign the agreement</h3>
            <label className={labelClass}>
              Full name of signatory
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Obi Owner"
              />
            </label>
            <div>
              <p className={labelClass}>Your signature</p>
              <SignaturePad onChange={setSignature} />
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={sign} disabled={pending || !name.trim()}>
                {pending ? "Signing…" : "I agree & sign"}
              </Button>
              {msg && (
                <span className={msg.ok ? "text-success text-sm" : "text-danger text-sm"}>
                  {msg.text}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
