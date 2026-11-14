"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldClass as field } from "@/components/ui/field";
import {
  cancelSchedule,
  createRoute,
  createSchedule,
  publishSchedule,
} from "@/features/schedules/actions";
import { formatKobo } from "@/lib/money";

type Opt = { id: string; label: string };
type Route = {
  id: string;
  name: string;
  origin: { name: string } | null;
  destination: { name: string } | null;
};
type Sched = {
  id: string;
  status: string;
  departure_at: string;
  arrival_estimate_at: string | null;
  base_fare_kobo: number | null;
  capacity: number | null;
  routes: { name: string } | null;
  origin: { name: string } | null;
  destination: { name: string } | null;
};


const statusTone: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  draft: "warning",
  published: "success",
  cancelled: "danger",
  departed: "neutral",
  completed: "neutral",
};

export function SchedulesConsole({
  vendorId,
  terminals,
  vehicles,
  routes,
  schedules,
}: {
  vendorId: string;
  terminals: Opt[];
  vehicles: { id: string; registration_no: string; display_name: string | null }[];
  routes: Route[];
  schedules: Sched[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [route, setRoute] = useState({
    originTerminalId: terminals[0]?.id ?? "",
    destinationTerminalId: terminals[1]?.id ?? "",
    name: "",
  });
  const [sched, setSched] = useState({
    routeId: routes[0]?.id ?? "",
    vehicleId: vehicles[0]?.id ?? "",
    departureAt: "",
    arrivalEstimateAt: "",
    fareNaira: "",
    boardingAddress: "",
    boardingContactPhone: "",
  });

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Something went wrong");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {err && <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{err}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Routes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createRoute({ vendorId, ...route }));
            }}
          >
            <label className="text-muted space-y-1 text-xs font-medium">
              Origin
              <select
                className={field}
                value={route.originTerminalId}
                onChange={(e) => setRoute({ ...route, originTerminalId: e.target.value })}
              >
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted space-y-1 text-xs font-medium">
              Destination
              <select
                className={field}
                value={route.destinationTerminalId}
                onChange={(e) => setRoute({ ...route, destinationTerminalId: e.target.value })}
              >
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted space-y-1 text-xs font-medium">
              Route name
              <input
                className={field}
                required
                value={route.name}
                onChange={(e) => setRoute({ ...route, name: e.target.value })}
                placeholder="Lagos → Abuja"
              />
            </label>
            <Button type="submit" disabled={pending}>
              Add route
            </Button>
          </form>
          <div className="divide-border divide-y text-sm">
            {routes.length === 0 ? (
              <p className="text-muted">No routes yet.</p>
            ) : (
              routes.map((r) => (
                <div key={r.id} className="flex justify-between py-2">
                  <span className="text-foreground font-medium">{r.name}</span>
                  <span className="text-muted">
                    {r.origin?.name} → {r.destination?.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {routes.length === 0 || vehicles.length === 0 ? (
            <p className="text-muted text-sm">
              Add a route and an active vehicle (with a published seat layout) first.
            </p>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => createSchedule({ vendorId, ...sched }));
              }}
            >
              <label className="text-muted space-y-1 text-xs font-medium">
                Route
                <select
                  className={field}
                  value={sched.routeId}
                  onChange={(e) => setSched({ ...sched, routeId: e.target.value })}
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-muted space-y-1 text-xs font-medium">
                Vehicle
                <select
                  className={field}
                  value={sched.vehicleId}
                  onChange={(e) => setSched({ ...sched, vehicleId: e.target.value })}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.display_name || v.registration_no}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-muted space-y-1 text-xs font-medium">
                Departs
                <input
                  type="datetime-local"
                  className={field}
                  required
                  value={sched.departureAt}
                  onChange={(e) => setSched({ ...sched, departureAt: e.target.value })}
                />
              </label>
              <label className="text-muted space-y-1 text-xs font-medium">
                Arrives (est.)
                <input
                  type="datetime-local"
                  className={field}
                  required
                  value={sched.arrivalEstimateAt}
                  onChange={(e) => setSched({ ...sched, arrivalEstimateAt: e.target.value })}
                />
              </label>
              <label className="text-muted space-y-1 text-xs font-medium">
                Fare (₦)
                <input
                  type="number"
                  min={1}
                  className={field}
                  required
                  value={sched.fareNaira}
                  onChange={(e) => setSched({ ...sched, fareNaira: e.target.value })}
                />
              </label>
              <label className="text-muted space-y-1 text-xs font-medium sm:col-span-2">
                Boarding address
                <input
                  className={field}
                  required
                  value={sched.boardingAddress}
                  onChange={(e) => setSched({ ...sched, boardingAddress: e.target.value })}
                  placeholder="e.g. 24 Jibowu St, Yaba, Lagos"
                />
              </label>
              <label className="text-muted space-y-1 text-xs font-medium">
                Boarding contact phone
                <input
                  className={field}
                  required
                  value={sched.boardingContactPhone}
                  onChange={(e) => setSched({ ...sched, boardingContactPhone: e.target.value })}
                  placeholder="e.g. +234 801 234 5678"
                />
              </label>
              <Button type="submit" disabled={pending} className="sm:col-span-2 lg:col-span-1">
                Add departure
              </Button>
            </form>
          )}

          <div className="divide-border divide-y">
            {schedules.length === 0 ? (
              <p className="text-muted text-sm">No schedules yet.</p>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground truncate text-sm font-medium">
                        {s.routes?.name ?? `${s.origin?.name} → ${s.destination?.name}`}
                      </p>
                      <Badge tone={statusTone[s.status] ?? "neutral"}>{s.status}</Badge>
                    </div>
                    <p className="text-muted text-xs">
                      {new Date(s.departure_at).toLocaleString("en-NG")} ·{" "}
                      {s.base_fare_kobo ? formatKobo(s.base_fare_kobo) : "—"}
                      {s.capacity ? ` · ${s.capacity} seats` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {s.status === "draft" && (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => publishSchedule(s.id))}
                      >
                        Publish
                      </Button>
                    )}
                    {(s.status === "draft" || s.status === "published") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => run(() => cancelSchedule(s.id))}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
