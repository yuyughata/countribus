"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/features/team/actions";

export function AcceptInvite({
  token,
  vendorName,
  roleLabel,
}: {
  token: string;
  vendorName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    start(async () => {
      const r = await acceptInvite(token);
      if (r.ok) router.push("/dashboard");
      else setError(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        You&apos;ve been invited to join{" "}
        <span className="text-foreground font-semibold">{vendorName}</span> as{" "}
        <span className="text-foreground font-semibold">{roleLabel}</span>.
      </p>
      {error && <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{error}</p>}
      <Button onClick={accept} disabled={pending} className="w-full" size="lg">
        {pending ? "Joining…" : "Accept & join"}
      </Button>
    </div>
  );
}
