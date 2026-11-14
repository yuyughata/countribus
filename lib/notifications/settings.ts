import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolved communication-provider settings. Values come from the admin-managed
 * `communication_settings` row (read with the service-role client so it works
 * from webhooks), falling back to environment variables for each field. A
 * channel only sends when it is enabled AND has the credentials it needs.
 *
 * When there is no settings row (e.g. local/dev with no service-role key) each
 * channel defaults to enabled, so env-configured sending keeps working.
 */
export type CommSettings = {
  email: { enabled: boolean; apiKey: string | null; from: string | null; fromName: string | null };
  sms: { enabled: boolean; sid: string | null; token: string | null; from: string | null };
  whatsapp: { enabled: boolean; token: string | null; phoneId: string | null };
};

export async function loadCommSettings(): Promise<CommSettings> {
  let row: Record<string, unknown> | null = null;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("communication_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle();
      row = (data as Record<string, unknown> | null) ?? null;
    }
  } catch {
    row = null;
  }

  const s = (k: string) => (typeof row?.[k] === "string" && row[k] ? (row[k] as string) : null);
  const b = (k: string) => (row ? Boolean(row[k]) : true);

  return {
    email: {
      enabled: b("email_enabled"),
      apiKey: s("resend_api_key") ?? process.env.RESEND_API_KEY ?? null,
      from: s("email_from") ?? process.env.NOTIFICATIONS_FROM_EMAIL ?? null,
      fromName: s("email_from_name"),
    },
    sms: {
      enabled: b("sms_enabled"),
      sid: s("twilio_account_sid") ?? process.env.TWILIO_ACCOUNT_SID ?? null,
      token: s("twilio_auth_token") ?? process.env.TWILIO_AUTH_TOKEN ?? null,
      from: s("twilio_from") ?? process.env.TWILIO_MESSAGING_FROM ?? null,
    },
    whatsapp: {
      enabled: b("whatsapp_enabled"),
      token: s("whatsapp_token") ?? process.env.WHATSAPP_TOKEN ?? null,
      phoneId: s("whatsapp_phone_id") ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
    },
  };
}
