"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fieldClass, labelClass } from "@/components/ui/field";
import { saveVendorPayoutAccount } from "@/features/payouts/actions";
import type { PayoutAccount } from "@/features/payouts/queries";
import type { Bank } from "@/lib/payments/paystack-transfers";

export function PayoutAccountForm({
  banks,
  initial,
}: {
  banks: Bank[];
  initial: PayoutAccount | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState({
    bankCode: initial?.bank_code ?? banks[0]?.code ?? "",
    accountNumber: initial?.account_number ?? "",
    accountName: initial?.account_name ?? "",
  });

  function save() {
    setMsg(null);
    const bank = banks.find((b) => b.code === f.bankCode);
    start(async () => {
      const r = await saveVendorPayoutAccount({
        bankCode: f.bankCode,
        bankName: bank?.name ?? "",
        accountNumber: f.accountNumber,
        accountName: f.accountName || undefined,
      });
      if (r.ok) {
        setMsg({ ok: true, text: r.message ?? "Saved." });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  }

  return (
    <div className="space-y-4">
      {initial && (
        <div className="bg-surface-muted flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm">
          <span>
            <span className="text-foreground font-medium">{initial.account_name}</span>
            <span className="text-muted">
              {" "}
              · {initial.bank_name} · ••••{initial.account_number.slice(-4)}
            </span>
          </span>
          <Badge tone={initial.is_verified ? "success" : "warning"}>
            {initial.is_verified ? "Verified" : "Unverified"}
          </Badge>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Bank
          <select
            className={fieldClass}
            value={f.bankCode}
            onChange={(e) => setF({ ...f, bankCode: e.target.value })}
          >
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Account number
          <input
            className={fieldClass}
            inputMode="numeric"
            maxLength={10}
            placeholder="0123456789"
            value={f.accountNumber}
            onChange={(e) =>
              setF({ ...f, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
            }
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Account name
          <input
            className={fieldClass}
            placeholder="As it appears at your bank"
            value={f.accountName}
            onChange={(e) => setF({ ...f, accountName: e.target.value })}
          />
          <span className="text-subtle text-xs font-normal">
            When Paystack is connected, the name is confirmed automatically from the account number.
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending || f.accountNumber.length !== 10}>
          {pending ? "Saving…" : initial ? "Update account" : "Save account"}
        </Button>
        {msg && (
          <span className={msg.ok ? "text-success text-sm" : "text-danger text-sm"}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
