import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CommStatus = {
  email: { enabled: boolean; apiKeySet: boolean; from: string; fromName: string };
  sms: { enabled: boolean; sidSet: boolean; tokenSet: boolean; from: string };
  whatsapp: { enabled: boolean; tokenSet: boolean; phoneId: string };
};

/** Masked provider status for the admin Integrations UI — never returns secrets. */
export async function getCommSettingsStatus(): Promise<CommStatus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("communication_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  const r = (data ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  return {
    email: {
      enabled: Boolean(r.email_enabled),
      apiKeySet: Boolean(r.resend_api_key),
      from: str("email_from"),
      fromName: str("email_from_name"),
    },
    sms: {
      enabled: Boolean(r.sms_enabled),
      sidSet: Boolean(r.twilio_account_sid),
      tokenSet: Boolean(r.twilio_auth_token),
      from: str("twilio_from"),
    },
    whatsapp: {
      enabled: Boolean(r.whatsapp_enabled),
      tokenSet: Boolean(r.whatsapp_token),
      phoneId: str("whatsapp_phone_id"),
    },
  };
}
