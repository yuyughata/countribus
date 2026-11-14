"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notifyOperatorsOfUpdate } from "@/features/agreements/notify";

export function NotifyOperatorsCard({
  version,
  announcedAt,
  operatorCount,
  signedCount,
}: {
  version: number;
  announcedAt: string | null;
  operatorCount: number;
  signedCount: number;
}) {
  const router = useRouter();
  const [working, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const unannounced = !announcedAt;

  function notify() {
    setMsg(null);
    start(async () => {
      const r = await notifyOperatorsOfUpdate();
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>Notify operators to review &amp; sign</CardTitle>
        {unannounced ? (
          <Badge tone="warning">Not yet sent</Badge>
        ) : (
          <Badge tone="success">Sent</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted text-sm">
          When you finish editing, send every approved operator an email and WhatsApp asking them to
          review the current version (
          <span className="text-foreground font-medium">v{version}</span>) and add a fresh
          signature. Operators who signed an earlier version must sign again.
        </p>
        <p className="text-subtle text-xs">
          {signedCount} of {operatorCount} operator{operatorCount === 1 ? "" : "s"} have signed v
          {version}.
          {announcedAt
            ? ` Operators were last notified on ${new Date(announcedAt).toLocaleString("en-NG")}.`
            : " Operators haven't been notified about this version yet."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant={unannounced ? "primary" : "outline"}
            onClick={notify}
            disabled={working}
          >
            {working
              ? "Sending…"
              : unannounced
                ? "Notify operators to review & sign"
                : "Notify again"}
          </Button>
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-muted" : "text-red-600"}`}>{msg.text}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
