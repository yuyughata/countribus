"use client";

import { useState } from "react";

import { Check, Copy, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MyReferral } from "@/features/promotions/queries";

export function ReferralCard({ referral }: { referral: MyReferral }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const { code, program, referredCount, qualifiedCount, availableRewardPercent } = referral;

  if (!code) return null;

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${code}`
      : `/register?ref=${code}`;

  function copy(what: "code" | "link", value: string) {
    try {
      void navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <div className="bg-ink-gradient relative overflow-hidden rounded-xl p-6 text-white">
      <div className="pointer-events-none absolute -top-10 -right-8 size-40 rounded-full bg-[radial-gradient(circle,rgba(200,161,92,0.18),transparent_70%)]" />
      <div className="relative">
        <span className="bg-accent-soft text-accent-strong inline-flex size-10 items-center justify-center rounded-xl">
          <Gift className="size-5" />
        </span>
        <h2 className="font-display mt-3 text-xl font-semibold">Refer friends & earn</h2>
        <p className="mt-1 text-sm text-white/70">
          {program.is_enabled
            ? `Share your code. When a friend completes their first paid trip, you get ${program.referrer_percent}% off your next booking.`
            : "Share your code with friends. Rewards are currently paused — check back soon."}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5">
            <span className="font-mono text-lg font-semibold tracking-wider">{code}</span>
            <button
              type="button"
              onClick={() => copy("code", code)}
              className="text-white/70 hover:text-white"
              aria-label="Copy code"
            >
              {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="accent"
            onClick={() => copy("link", link)}
            className="gap-2"
          >
            {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied === "link" ? "Link copied" : "Copy invite link"}
          </Button>
        </div>

        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="text-xl font-semibold">{referredCount}</p>
            <p className="text-white/60">Friends referred</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{qualifiedCount}</p>
            <p className="text-white/60">Completed a trip</p>
          </div>
          {availableRewardPercent != null && (
            <div>
              <p className="text-accent text-xl font-semibold">{availableRewardPercent}% off</p>
              <p className="text-white/60">Reward ready</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
