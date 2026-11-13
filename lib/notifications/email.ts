import "server-only";

/**
 * Email transport abstraction.
 *
 * In production this is backed by a transactional email provider (Resend,
 * Postmark, SES, …). Credentials are server-only and injected via env — never
 * committed. When no provider is configured (local/dev, or before keys are
 * provisioned) sending is a deliberate no-op that reports `not_configured`,
 * so the notification is recorded as `skipped` rather than `failed`.
 */

export type SendResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; reason: string; configured: boolean };

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function provider(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATIONS_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function emailConfigured(): boolean {
  return provider() !== null;
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const p = provider();
  if (!p) return { ok: false, reason: "email provider not configured", configured: false };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${p.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: p.from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `provider ${res.status}: ${body.slice(0, 200)}`, configured: true };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerMessageId: json.id ?? null };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send failed", configured: true };
  }
}
