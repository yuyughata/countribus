import "server-only";

import type { SendResult } from "@/lib/notifications/email";
import { loadCommSettings } from "@/lib/notifications/settings";

/**
 * SMS transport (Twilio REST). Credentials come from the admin-managed
 * communication settings (with env fallback); degrades to a recorded
 * `not configured` no-op when unset or disabled.
 */

export async function smsConfigured(): Promise<boolean> {
  const { sms } = await loadCommSettings();
  return sms.enabled && !!sms.sid && !!sms.token && !!sms.from;
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const { sms } = await loadCommSettings();
  if (!sms.enabled || !sms.sid || !sms.token || !sms.from) {
    return { ok: false, reason: "sms provider not configured", configured: false };
  }

  try {
    const auth = Buffer.from(`${sms.sid}:${sms.token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sms.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: sms.from, Body: body }).toString(),
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
