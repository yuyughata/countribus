"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BadgePercent, Check, Coins, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldClass as field, labelClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { formatKobo, koboToNaira, nairaToKobo } from "@/lib/money";
import { payStaffIncentive, setIncentiveRule } from "@/features/incentives/actions";
import type { IncentiveRule, IncentivesData } from "@/features/incentives/queries";

function describeRule(rule: IncentiveRule | null): string {
  if (!rule) return "No incentive";
  return rule.kind === "fixed"
    ? `${formatKobo(rule.fixed_kobo ?? 0)} per booking`
    : `${(rule.rate_bps ?? 0) / 100}% of fare`;
}

function RateForm({
  vendorId,
  staffId,
  current,
  onDone,
}: {
  vendorId: string;
  staffId: string | null;
  current: IncentiveRule | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"fixed" | "percent">(current?.kind ?? "percent");
  const [fixedNaira, setFixedNaira] = useState(
    current?.kind === "fixed" ? String(koboToNaira(current.fixed_kobo ?? 0)) : "",
  );
  const [percent, setPercent] = useState(
    current?.kind === "percent" ? String((current.rate_bps ?? 0) / 100) : "",
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    start(async () => {
      const r = await setIncentiveRule({
        vendorId,
        staffId,
        kind,
        fixedKobo: kind === "fixed" ? nairaToKobo(Number(fixedNaira || 0)) : undefined,
        rateBps: kind === "percent" ? Math.round(Number(percent || 0) * 100) : undefined,
      });
      if (r.ok) {
        onDone();
        router.refresh();
      } else {
        setErr(r.error);
      }
    });
  }

  return (
    <div className="border-border bg-surface-muted/40 space-y-3 rounded-lg border p-3">
      <div className="flex gap-2">
        {(["percent", "fixed"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              kind === k ? "border-primary text-primary bg-primary-soft" : "border-border text-muted",
            )}
          >
            {k === "percent" ? "Percentage" : "Fixed amount"}
          </button>
        ))}
      </div>
      {kind === "percent" ? (
        <label className={labelClass}>
          Percentage of fare (%)
          <input
            className={field}
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="e.g. 5"
          />
        </label>
      ) : (
        <label className={labelClass}>
          Amount per booking (₦)
          <input
            className={field}
            type="number"
            min={0}
            step="50"
            value={fixedNaira}
            onChange={(e) => setFixedNaira(e.target.value)}
            placeholder="e.g. 500"
          />
        </label>
      )}
      {err && <p className="text-danger text-xs">{err}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save incentive"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function IncentivesManager({
  vendorId,
  data,
}: {
  vendorId: string;
  data: IncentivesData;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // "default" | staffId
  const [paying, startPay] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function pay(staffId: string) {
    setNote(null);
    startPay(async () => {
      const r = await payStaffIncentive(vendorId, staffId);
      setNote(r.ok ? `Recorded ${formatKobo(r.amountKobo)} incentive payment.` : r.error);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgePercent className="text-primary size-4" /> Default incentive (all staff)
          </CardTitle>
          <Badge tone={data.defaultRule ? "info" : "neutral"}>{describeRule(data.defaultRule)}</Badge>
        </CardHeader>
        <CardContent>
          {editing === "default" ? (
            <RateForm
              vendorId={vendorId}
              staffId={null}
              current={data.defaultRule}
              onDone={() => setEditing(null)}
            />
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing("default")}>
              {data.defaultRule ? "Change default incentive" : "Set a default incentive"}
            </Button>
          )}
          <p className="text-subtle mt-2 text-xs">
            Applies to every sale a staff member makes, unless they have their own rate below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="text-accent size-4" /> Staff sales &amp; incentives
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.staff.length === 0 ? (
            <p className="text-muted p-5 text-sm">No active staff.</p>
          ) : (
            <div className="divide-border divide-y">
              {data.staff.map((s) => (
                <div key={s.userId} className="space-y-3 px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {s.name}
                        <span className="text-subtle ml-2 text-xs font-normal">
                          {s.role.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="text-subtle text-xs">
                        {s.salesCount} sale{s.salesCount === 1 ? "" : "s"} ·{" "}
                        {formatKobo(s.grossSoldKobo)} sold · rate:{" "}
                        {s.override ? describeRule(s.override) : "default"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-foreground text-sm font-semibold">
                          {formatKobo(s.pendingKobo)}
                        </p>
                        <p className="text-subtle text-[11px]">outstanding</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted text-sm">{formatKobo(s.paidKobo)}</p>
                        <p className="text-subtle text-[11px]">paid</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(editing === s.userId ? null : s.userId)}
                    >
                      {s.override ? "Change rate" : "Set staff rate"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={paying || s.pendingKobo === 0}
                      onClick={() => pay(s.userId)}
                    >
                      <Wallet className="size-4" /> Pay out {formatKobo(s.pendingKobo)}
                    </Button>
                  </div>

                  {editing === s.userId && (
                    <RateForm
                      vendorId={vendorId}
                      staffId={s.userId}
                      current={s.override}
                      onDone={() => setEditing(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {note && (
        <p className="bg-surface-muted text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm">
          <Check className="text-success size-4" /> {note}
        </p>
      )}
    </div>
  );
}
