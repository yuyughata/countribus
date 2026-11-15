"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { CalendarClock, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { fieldClass as field, labelClass } from "@/components/ui/field";
import { updateRoute, updateSchedule } from "@/features/schedules/actions";
import { koboToNaira } from "@/lib/money";
import type { RouteSchedule, TerminalOption } from "@/features/schedules/queries";

export type ManageableRoute = {
  id: string;
  name: string;
  origin_terminal_id: string;
  destination_terminal_id: string;
  origin: { name: string } | null;
  destination: { name: string } | null;
};

type Open = { id: string; mode: "route" | "sched" } | null;

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  published: "success",
  draft: "warning",
  cancelled: "danger",
  completed: "neutral",
};

export function RoutesManager({
  routes,
  terminals,
  schedules,
}: {
  routes: ManageableRoute[];
  terminals: TerminalOption[];
  schedules: RouteSchedule[];
}) {
  const [open, setOpen] = useState<Open>(null);
  const byRoute = useMemo(() => {
    const m = new Map<string, RouteSchedule[]>();
    for (const s of schedules) {
      const arr = m.get(s.route_id) ?? [];
      arr.push(s);
      m.set(s.route_id, arr);
    }
    return m;
  }, [schedules]);

  return (
    <Card className="divide-border divide-y">
      {routes.map((r) => (
        <div key={r.id}>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-semibold">{r.name}</p>
              <p className="text-muted truncate text-xs">
                {r.origin?.name} → {r.destination?.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setOpen((o) =>
                    o?.id === r.id && o.mode === "route" ? null : { id: r.id, mode: "route" },
                  )
                }
                className="text-primary inline-flex items-center gap-1 text-xs font-medium"
              >
                <Pencil className="size-3.5" /> Edit route
              </button>
              <button
                type="button"
                onClick={() =>
                  setOpen((o) =>
                    o?.id === r.id && o.mode === "sched" ? null : { id: r.id, mode: "sched" },
                  )
                }
                className="text-primary inline-flex items-center gap-1 text-xs font-medium"
              >
                <CalendarClock className="size-3.5" /> Edit schedule
              </button>
              <DeleteButton kind="route" id={r.id} name={r.name} />
            </div>
          </div>

          {open?.id === r.id && open.mode === "route" && (
            <RouteEditForm route={r} terminals={terminals} onDone={() => setOpen(null)} />
          )}
          {open?.id === r.id && open.mode === "sched" && (
            <SchedulePanel schedules={byRoute.get(r.id) ?? []} onDone={() => setOpen(null)} />
          )}
        </div>
      ))}
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
      } else setError(r.error);
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

function SchedulePanel({ schedules, onDone }: { schedules: RouteSchedule[]; onDone: () => void }) {
  return (
    <div className="bg-surface-muted/40 space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-foreground text-sm font-semibold">Departures on this route</p>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
      {schedules.length === 0 ? (
        <p className="text-muted text-sm">
          No departures yet.{" "}
          <Link href="/dashboard/schedules" className="text-primary font-medium">
            Schedule one
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <ScheduleEditForm key={s.id} schedule={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleEditForm({ schedule }: { schedule: RouteSchedule }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    departureAt: toLocalInput(schedule.departure_at),
    arrivalEstimateAt: toLocalInput(schedule.arrival_estimate_at),
    fareNaira: schedule.base_fare_kobo ? String(koboToNaira(schedule.base_fare_kobo)) : "",
    boardingAddress: schedule.boarding_address ?? "",
    boardingContactPhone: schedule.boarding_contact_phone ?? "",
  });
  const cancelled = schedule.status === "cancelled";

  function save() {
    setNote(null);
    start(async () => {
      const r = await updateSchedule(schedule.id, { ...form, fareNaira: Number(form.fareNaira) });
      setNote({ ok: r.ok, text: r.ok ? "Saved." : r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="border-border bg-surface space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Badge tone={STATUS_TONE[schedule.status] ?? "neutral"}>{schedule.status}</Badge>
        {note && (
          <span className={note.ok ? "text-success text-xs" : "text-danger text-xs"}>
            {note.text}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Departure
          <input
            type="datetime-local"
            className={field}
            value={form.departureAt}
            disabled={cancelled}
            onChange={(e) => setForm({ ...form, departureAt: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Arrival estimate
          <input
            type="datetime-local"
            className={field}
            value={form.arrivalEstimateAt}
            disabled={cancelled}
            onChange={(e) => setForm({ ...form, arrivalEstimateAt: e.target.value })}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <label className={labelClass}>
          Fare (₦)
          <input
            type="number"
            min={0}
            className={field}
            value={form.fareNaira}
            disabled={cancelled}
            onChange={(e) => setForm({ ...form, fareNaira: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Boarding contact phone
          <input
            className={field}
            value={form.boardingContactPhone}
            disabled={cancelled}
            onChange={(e) => setForm({ ...form, boardingContactPhone: e.target.value })}
          />
        </label>
      </div>
      <label className={labelClass}>
        Boarding address
        <input
          className={field}
          value={form.boardingAddress}
          disabled={cancelled}
          onChange={(e) => setForm({ ...form, boardingAddress: e.target.value })}
        />
      </label>
      {!cancelled && (
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save departure"}
        </Button>
      )}
    </div>
  );
}
