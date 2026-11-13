"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";

import { deleteVehicle } from "@/features/fleet/actions";
import { deleteRoute } from "@/features/schedules/actions";

/** Confirm-and-delete control for a vehicle or route (owner/manager/admin). */
export function DeleteButton({
  kind,
  id,
  name,
}: {
  kind: "vehicle" | "route";
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run() {
    if (!window.confirm(`Delete this ${kind}: “${name}”? This cannot be undone.`)) return;
    setErr(null);
    start(async () => {
      const r = kind === "vehicle" ? await deleteVehicle(id) : await deleteRoute(id);
      if (!r.ok) setErr(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {err && <span className="text-danger max-w-[220px] text-right text-xs">{err}</span>}
      <button
        type="button"
        onClick={run}
        disabled={pending}
        aria-label={`Delete ${kind}`}
        title={`Delete ${kind}`}
        className="text-subtle hover:text-danger hover:bg-danger-soft flex size-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
