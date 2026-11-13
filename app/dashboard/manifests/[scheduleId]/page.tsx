import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Download, Luggage } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BoardingControls } from "@/components/ops/boarding-controls";
import { PASSENGER_TYPE_LABEL } from "@/lib/booking/passenger-types";
import { getManifest } from "@/features/ops/queries";

export const metadata = { title: "Manifest" };

export default async function ManifestPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const { schedule, rows } = await getManifest(scheduleId);
  if (!schedule) notFound();

  const boarded = rows.filter((r) => r.boarding_status === "boarded").length;
  const luggageTotal = rows.reduce((n, r) => n + (r.luggage_items?.[0]?.count ?? 0), 0);

  return (
    <div className="space-y-5 p-5">
      <Link
        href="/dashboard/manifests"
        className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> All departures
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold">
            {schedule.origin?.name} → {schedule.destination?.name}
          </h2>
          <p className="text-muted text-sm">
            {new Date(schedule.departure_at).toLocaleString("en-NG")} · {rows.length} passengers ·{" "}
            {boarded} boarded · <Luggage className="inline size-3.5" /> {luggageTotal} bags
          </p>
        </div>
        <a href={`/api/manifests/${scheduleId}/csv`}>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="size-4" /> Export CSV
          </Button>
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Passenger manifest</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-muted p-5 text-sm">No paid passengers yet.</p>
          ) : (
            <div className="divide-border divide-y">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium " +
                        (r.seat_label
                          ? "bg-surface-muted text-foreground"
                          : "bg-accent-soft text-accent-strong text-xs")
                      }
                    >
                      {r.seat_label ?? "LAP"}
                    </span>
                    <div>
                      <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
                        {r.passengers?.full_name}
                        <span className="bg-surface-muted text-muted rounded-full px-2 py-0.5 text-[10px] font-medium">
                          {PASSENGER_TYPE_LABEL[r.passenger_type]}
                        </span>
                      </p>
                      <p className="text-muted text-xs">
                        {r.bookings?.reference} · {r.bookings?.contact_phone} ·{" "}
                        {r.luggage_items?.[0]?.count ?? 0} bag(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      tone={
                        r.boarding_status === "boarded"
                          ? "success"
                          : r.boarding_status === "checked_in"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {r.boarding_status.replace("_", " ")}
                    </Badge>
                    <BoardingControls
                      scheduleId={scheduleId}
                      bookingPassengerId={r.id}
                      status={r.boarding_status}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
