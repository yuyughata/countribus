"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notifications/email";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

async function updateSettings(patch: Record<string, unknown>): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Only a platform admin can change these" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("communication_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: ctx.userId })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/communications/integrations");
  return { ok: true, message: "Saved." };
}

/** Only include a secret in the patch when a new value was typed (blank keeps it). */
function withSecret(patch: Record<string, unknown>, key: string, value?: string) {
  if (value && value.trim() !== "") patch[key] = value.trim();
  return patch;
}

export async function saveEmailSettings(input: {
  enabled: boolean;
  apiKey?: string;
  from?: string;
  fromName?: string;
}): Promise<Result> {
  const patch: Record<string, unknown> = {
    email_enabled: input.enabled,
    email_from: input.from?.trim() || null,
    email_from_name: input.fromName?.trim() || null,
  };
  return updateSettings(withSecret(patch, "resend_api_key", input.apiKey));
}

export async function saveSmsSettings(input: {
  enabled: boolean;
  sid?: string;
  token?: string;
  from?: string;
}): Promise<Result> {
  const patch: Record<string, unknown> = {
    sms_enabled: input.enabled,
    twilio_from: input.from?.trim() || null,
  };
  withSecret(patch, "twilio_account_sid", input.sid);
  withSecret(patch, "twilio_auth_token", input.token);
  return updateSettings(patch);
}

export async function saveWhatsAppSettings(input: {
  enabled: boolean;
  token?: string;
  phoneId?: string;
}): Promise<Result> {
  const patch: Record<string, unknown> = {
    whatsapp_enabled: input.enabled,
    whatsapp_phone_id: input.phoneId?.trim() || null,
  };
  return updateSettings(withSecret(patch, "whatsapp_token", input.token));
}

/** Send a test email to the signed-in admin to confirm the Resend config. */
export async function sendTestEmail(): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Not allowed" };
  if (!ctx.email) return { ok: false, error: "Your account has no email address" };
  const r = await sendEmail({
    to: ctx.email,
    subject: "Countribus test email",
    html: "<p>This is a test email from Countribus. Your email integration works. ✅</p>",
    text: "This is a test email from Countribus. Your email integration works.",
  });
  if (!r.ok) {
    return {
      ok: false,
      error: r.configured ? `Send failed: ${r.reason}` : "Email is not enabled/configured yet.",
    };
  }
  return { ok: true, message: `Test email sent to ${ctx.email}.` };
}
