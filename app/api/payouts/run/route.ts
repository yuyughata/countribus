import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { executePayouts } from "@/lib/payments/run-payouts";

/**
 * Scheduled payout cycle. A scheduler (cron) POSTs here on an interval (e.g.
 * hourly) so paid bookings are settled to vendors within 24h. Authorized with a
 * bearer token (PAYOUTS_CRON_SECRET). If the secret isn't configured, the
 * endpoint is disabled (secure by default).
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv().PAYOUTS_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "payouts cron not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await executePayouts(0);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "payout run failed" },
      { status: 500 },
    );
  }
}
