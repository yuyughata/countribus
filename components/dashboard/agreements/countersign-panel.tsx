"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fieldClass, labelClass } from "@/components/ui/field";
import { SignaturePad } from "@/components/dashboard/agreements/signature-pad";
import { countersignAgreement } from "@/features/agreements/vendor-actions";
import type { PendingCountersignature } from "@/features/agreements/vendor-queries";

export function CountersignPanel({ pending }: { pending: PendingCountersignature[] }) {
  const router = useRouter();
  const [working, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (pending.length === 0) return null;

  function submit(id: string) {
    setMsg(null);
    if (!sig) {
      setMsg({ ok: false, text: "Please add your signature." });
      return;
    }
    start(async () => {
      const r = await countersignAgreement(id, sig!, name);
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Counter-signed.") : r.error });
      if (r.ok) {
        setOpenId(null);
        setName("");
        setSig(null);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Awaiting your counter-signature</CardTitle>
        <Badge tone="warning">{pending.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {pending.map((p) => (
          <div key={p.id} className="border-border rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <p className="text-foreground font-medium">{p.vendors?.name ?? "Operator"}</p>
                <p className="text-subtle text-xs">
                  Signed by {p.vendor_signer_name ?? "—"}
                  {p.vendor_signed_at &&
                    ` · ${new Date(p.vendor_signed_at).toLocaleDateString("en-NG")}`}
                  {p.agreements && ` · v${p.agreements.version}`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={openId === p.id ? "outline" : "primary"}
                onClick={() => setOpenId(openId === p.id ? null : p.id)}
              >
                {openId === p.id ? "Cancel" : "Counter-sign"}
              </Button>
            </div>

            {openId === p.id && (
              <div className="mt-4 space-y-3">
                <label className={labelClass}>
                  Your name (for Countribus)
                  <input
                    className={fieldClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tola Adeyemi"
                  />
                </label>
                <div>
                  <p className={labelClass}>Platform signature</p>
                  <SignaturePad onChange={setSig} />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={working || !name.trim()}
                    onClick={() => submit(p.id)}
                  >
                    {working ? "Signing…" : "Confirm counter-signature"}
                  </Button>
                  {msg && (
                    <span className={msg.ok ? "text-success text-sm" : "text-danger text-sm"}>
                      {msg.text}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
