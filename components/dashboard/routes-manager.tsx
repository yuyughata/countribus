"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { fieldClass as field, labelClass } from "@/components/ui/field";
import { updateRoute } from "@/features/schedules/actions";
import type { TerminalOption } from "@/features/schedules/queries";

export type ManageableRoute = {
  id: string;
  name: string;
  origin_terminal_id: string;
  destination_terminal_id: string;
  origin: { name: string } | null;
  destination: { name: string } | null;
};

export function RoutesManager({
  routes,
  terminals,
}: {
  routes: ManageableRoute[];
  terminals: TerminalOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="divide-border divide-y">
      {routes.map((r) =>
        editingId === r.id ? (
          <RouteEditForm
            key={r.id}
            route={r}
            terminals={terminals}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <div key={r.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-semibold">{r.name}</p>
              <p className="text-muted truncate text-xs">
                {r.origin?.name} → {r.destination?.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingId(r.id)}
                className="text-primary inline-flex items-center gap-1 text-xs font-medium"
              >
                <Pencil className="size-3.5" /> Edit route
              </button>
              <DeleteButton kind="route" id={r.id} name={r.name} />
            </div>
          </div>
        ),
      )}
    </Card>
  );
}

function RouteEditForm({
  route,
  terminals,
  onDone,
}: {
  route: ManageableRoute;
  terminals: TerminalOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: route.name,
    originTerminalId: route.origin_terminal_id,
    destinationTerminalId: route.destination_terminal_id,
  });

  function save() {
    setError(null);
    start(async () => {
      const r = await updateRoute(route.id, form);
      if (r.ok) {
        onDone();
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="bg-surface-muted/40 space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          From (origin terminal)
          <select
            className={field}
            value={form.originTerminalId}
            onChange={(e) => setForm({ ...form, originTerminalId: e.target.value })}
          >
            {terminals.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          To (destination terminal)
          <select
            className={field}
            value={form.destinationTerminalId}
            onChange={(e) => setForm({ ...form, destinationTerminalId: e.target.value })}
          >
            {terminals.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={labelClass}>
        Route name
        <input
          className={field}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Lagos → Abuja"
        />
      </label>
      {error && <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
