"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { decideVendor } from "@/features/vendors/actions";

/** Approve / reject / suspend controls for a vendor (platform admin only). */
export function VendorDecisionButtons({
  vendorId,
  status,
}: {
  vendorId: string;
  status: "pending" | "approved" | "suspended" | "rejected";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(decision: "approved" | "rejected" | "suspended") {
    setError(null);
    startTransition(async () => {
      const res = await decideVendor({ vendorId, decision });
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status !== "approved" && (
          <Button size="sm" disabled={pending} onClick={() => act("approved")}>
            Approve
          </Button>
        )}
        {status === "pending" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act("rejected")}>
            Reject
          </Button>
        )}
        {status === "approved" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act("suspended")}>
            Suspend
          </Button>
        )}
      </div>
      {error && <span className="text-danger text-xs">{error}</span>}
    </div>
  );
}
