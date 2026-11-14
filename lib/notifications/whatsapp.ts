import "server-only";

import type { SendResult } from "@/lib/notifications/email";
import { loadCommSettings } from "@/lib/notifications/settings";

/**
 * WhatsApp transport (Meta WhatsApp Cloud API). Credentials come from the
 * admin-managed communication settings (with env fallback); degrades to a
 * recorded `not configured` no-op when unset or disabled.
 *
 * Note: outside the 24-hour customer-service window Meta requires an approved
 * message template. This sends a plain text body, which works for session
 * replies and in testing; production should switch to a `template` payload
 * with an approved "booking_confirmation" template.
 */

export async function whatsappConfigured(): Promise<boolean> {
  const { whatsapp } = await loadCommSettings();
  return whatsapp.enabled && !!whatsapp.token && !!whatsapp.phoneId;
}

/** Normalise to the digits-only E.164-without-plus form Meta expects. */
function toWaId(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const { whatsapp } = await loadCommSettings();
  if (!whatsapp.enabled || !whatsapp.token || !whatsapp.phoneId) {
    return { ok: false, reason: "whatsapp provider not configured", configured: false };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${whatsapp.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsapp.token}`,
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
