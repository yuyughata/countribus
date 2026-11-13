import "server-only";

import type { SendResult } from "@/lib/notifications/email";

/**
 * SMS transport (Twilio REST). Server-only credentials; degrades to a
 * recorded `not configured` no-op when unset, so unprovisioned environments
 * record `skipped` rather than `failed`.
 */

function provider(): { sid: string; token: string; from: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_MESSAGING_FROM;
  if (!sid || !token || !from) return null;
  return { sid, token, from };
}

export function smsConfigured(): boolean {
  return provider() !== null;
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const p = provider();
  if (!p) return { ok: false, reason: "sms provider not configured", configured: false };

  try {
    const auth = Buffer.from(`${p.sid}:${p.token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${p.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: p.from, Body: body }).toString(),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, reason: `provider ${res.status}: ${t.slice(0, 200)}`, configured: true };
    }
    const json = (await res.json().catch(() => ({}))) as { sid?: string };
    return { ok: true, providerMessageId: json.sid ?? null };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send failed", configured: true };
  }
}
