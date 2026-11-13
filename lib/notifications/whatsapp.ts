import "server-only";

import type { SendResult } from "@/lib/notifications/email";

/**
 * WhatsApp transport (Meta WhatsApp Cloud API). Server-only credentials;
 * degrades to a recorded `not configured` no-op when unset.
 *
 * Note: outside the 24-hour customer-service window Meta requires an approved
 * message template. This sends a plain text body, which works for session
 * replies and in testing; production should switch to a `template` payload
 * with an approved "booking_confirmation" template.
 */

function provider(): { token: string; phoneId: string } | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  return { token, phoneId };
}

export function whatsappConfigured(): boolean {
  return provider() !== null;
}

/** Normalise to the digits-only E.164-without-plus form Meta expects. */
function toWaId(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const p = provider();
  if (!p) return { ok: false, reason: "whatsapp provider not configured", configured: false };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${p.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${p.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWaId(to),
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, reason: `provider ${res.status}: ${t.slice(0, 200)}`, configured: true };
    }
    const json = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
    return { ok: true, providerMessageId: json.messages?.[0]?.id ?? null };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send failed", configured: true };
  }
}
