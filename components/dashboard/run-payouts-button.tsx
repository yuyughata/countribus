"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { runPayouts } from "@/features/payouts/actions";

export function RunPayoutsButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const r = await runPayouts();
      if (r.ok) {
        setMsg(
          r.created === 0
            ? "Nothing due for payout."
            : `${r.created} payout(s) scheduled${r.transferred ? `, ${r.transferred} sent` : ""}.${r.note ? " " + r.note : ""}`,
        );
        router.refresh();
      } else setMsg(r.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" size="sm" onClick={run} disabled={pending}>
        {pending ? "Running…" : "Run payouts now"}
      </Button>
      {msg && <span className="text-muted text-sm">{msg}</span>}
    </div>
  );
}
