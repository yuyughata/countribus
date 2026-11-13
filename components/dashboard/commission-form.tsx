"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { setPlatformCommission } from "@/features/settings/actions";

export function CommissionForm({ currentPercent }: { currentPercent: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [percent, setPercent] = useState(String(currentPercent));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await setPlatformCommission({ percent });
      if (r.ok) {
        setMsg({ ok: true, text: `Commission set to ${r.percent}%. New bookings use this rate.` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="text-muted block space-y-1 text-xs font-medium">
        Commission percentage
        <div className="flex items-center gap-2">
          <div className="relative w-40">
            <input
              className="border-border bg-surface text-foreground focus-visible:border-primary h-10 w-full rounded-md border pr-8 pl-3 text-sm focus-visible:outline-none"
              type="number"
              min={0}
              max={100}
              step="0.1"
              required
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
            <span className="text-subtle absolute top-1/2 right-3 -translate-y-1/2 text-sm">%</span>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Update commission"}
          </Button>
        </div>
      </label>
      {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      <p className="text-subtle text-xs">
        Applied to every new paid booking: the platform keeps this share and the operator receives
        the rest. Existing bookings are unchanged.
      </p>
    </form>
  );
}
