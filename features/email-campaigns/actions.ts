"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { buildCampaignHtml } from "@/lib/notifications/campaign-html";
import { sendEmail } from "@/lib/notifications/email";
import { resolveRecipients } from "@/features/email-campaigns/recipients";

export type CampaignInput = {
  id?: string;
  type: string;
  subject: string;
  previewText?: string;
  headerImageUrl?: string;
  bodyHtml: string;
  buttonText?: string;
  buttonUrl?: string;
  footerImageUrl?: string;
  audiences: string[];
  extraRecipients: string[];
};

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const MAX_SEND = 1000;

async function requireAdmin() {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) throw new Error("forbidden");
  return ctx;
}

function toRow(v: CampaignInput, userId: string) {
  return {
    type: v.type as "newsletter" | "promotion" | "announcement" | "service_update",
    subject: v.subject,
    preview_text: v.previewText?.trim() || null,
    header_image_url: v.headerImageUrl?.trim() || null,
    body_html: v.bodyHtml,
    button_text: v.buttonText?.trim() || null,
    button_url: v.buttonUrl?.trim() || null,
    footer_image_url: v.footerImageUrl?.trim() || null,
    audiences: v.audiences,
    extra_recipients: v.extraRecipients,
    created_by: userId,
  };
}

export async function saveCampaign(input: CampaignInput): Promise<SaveResult> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch {
    return { ok: false, error: "Only a platform admin can edit emails" };
  }
  const supabase = await createClient();
  const row = toRow(input, ctx.userId);

  if (input.id) {
    const { error } = await supabase.from("email_campaigns").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard/communications/emails");
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase.from("email_campaigns").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save" };
  revalidatePath("/dashboard/communications/emails");
  return { ok: true, id: data.id };
}

export async function countRecipients(audiences: string[], extra: string[]): Promise<number> {
  try {
    await requireAdmin();
  } catch {
    return 0;
  }
  const emails = await resolveRecipients(audiences, extra);
  return emails.length;
}

export async function sendTestCampaign(input: CampaignInput): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  if (!ctx.email) return { ok: false, error: "Your account has no email address" };
  const html = buildCampaignHtml({
    previewText: input.previewText,
    headerImageUrl: input.headerImageUrl,
    bodyHtml: input.bodyHtml,
    button: { text: input.buttonText, url: input.buttonUrl },
    footerImageUrl: input.footerImageUrl,
  });
  const r = await sendEmail({
    to: ctx.email,
    subject: `[TEST] ${input.subject || "Countribus email"}`,
    html,
    text: input.previewText ?? input.subject,
  });
  if (!r.ok) {
    return {
      ok: false,
      error: r.configured
        ? `Send failed: ${r.reason}`
        : "Enable + configure email under Integrations first.",
    };
  }
  return { ok: true, message: `Test sent to ${ctx.email}.` };
}

export async function sendCampaign(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const { data: c } = await supabase.from("email_campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) return { ok: false, error: "Email not found" };
  if (!c.subject?.trim()) return { ok: false, error: "Add a subject before sending" };

  const recipients = await resolveRecipients(c.audiences ?? [], c.extra_recipients ?? []);
  if (recipients.length === 0)
    return { ok: false, error: "No recipients — pick at least one audience" };

  await supabase.from("email_campaigns").update({ status: "sending" }).eq("id", id);

  const html = buildCampaignHtml({
    previewText: c.preview_text,
    headerImageUrl: c.header_image_url,
    bodyHtml: c.body_html,
    button: { text: c.button_text, url: c.button_url },
    footerImageUrl: c.footer_image_url,
  });

  const slice = recipients.slice(0, MAX_SEND);
  let sent = 0;
  for (const to of slice) {
    const r = await sendEmail({ to, subject: c.subject, html, text: c.preview_text ?? c.subject });
    if (r.ok) sent++;
  }

  const ok = sent > 0;
  await supabase
    .from("email_campaigns")
    .update({
      status: ok ? "sent" : "failed",
      recipient_count: recipients.length,
      sent_count: sent,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/dashboard/communications/emails");
  if (!ok)
    return { ok: false, error: "Nothing sent — check that email is enabled under Integrations." };
  return {
    ok: true,
    message: `Sent to ${sent} of ${recipients.length} recipient(s)${recipients.length > MAX_SEND ? ` (capped at ${MAX_SEND})` : ""}.`,
  };
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/communications/emails");
  return { ok: true };
}
