import { CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Verify ticket" };

type VerifyResult = {
  valid: boolean;
  reason?: string;
  ticket_status?: string;
  booking_status?: string;
  reference?: string;
  passenger?: string;
  seat?: string;
  boarding_status?: string;
  vendor?: string;
  origin?: string;
  destination?: string;
  departure_at?: string;
};

export default async function VerifyPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_ticket", { p_qr_token: qrToken });
  const r = (data ?? { valid: false }) as VerifyResult;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
      <Card className="w-full">
        <CardContent className="space-y-4 py-8 text-center">
          {r.valid ? (
            <>
              <CheckCircle2 className="text-success mx-auto size-14" />
              <h1 className="text-success text-xl font-semibold">Valid ticket</h1>
            </>
          ) : (
            <>
              <XCircle className="text-danger mx-auto size-14" />
              <h1 className="text-danger text-xl font-semibold">Not valid for boarding</h1>
              <p className="text-muted text-sm">
                {r.reason === "not found"
                  ? "Ticket not found."
                  : `Ticket ${r.ticket_status ?? ""}, booking ${r.booking_status ?? ""}.`}
              </p>
            </>
          )}

          {r.reference && (
            <div className="border-border space-y-1 border-t pt-4 text-left text-sm">
              <Row label="Reference" value={r.reference} />
              <Row label="Passenger" value={r.passenger} />
              <Row label="Seat" value={r.seat} />
              <Row label="Operator" value={r.vendor} />
              <Row
                label="Route"
                value={r.origin && r.destination ? `${r.origin} → ${r.destination}` : undefined}
              />
              <Row
                label="Departs"
                value={
                  r.departure_at ? new Date(r.departure_at).toLocaleString("en-NG") : undefined
                }
              />
              <Row label="Boarding" value={r.boarding_status?.replace("_", " ")} />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
