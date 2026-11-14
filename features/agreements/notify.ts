"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/context";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/email";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import {
  partnerAgreementUpdatedEmail,
  partnerAgreementUpdatedSms,
} from "@/lib/notifications/templates";
import { getCurrentAgreement } from "@/features/agreements/queries";

export type NotifyResult = { ok: true; message: string } | { ok: false; error: string };

type Recipient = {
  userId: string;
  vendorName: string;
  email: string | null;
  phone: string | null;
};

/**
 * Notify every approved operator's owner/manager that the Partner Agreement has
 * changed and they must review & re-sign — by email AND WhatsApp (best-effort).
 *
 * Admin-only. Sends once and stamps `agreements.announced_at` so the admin UI
 * can show the current version was announced (and avoid spamming on every
 * clause edit — the admin triggers this explicitly after finishing edits).
 */
export async function notifyOperatorsOfUpdate(): Promise<NotifyResult> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin)
    return { ok: false, error: "Only a platform admin can notify operators" };

  const current = await getCurrentAgreement("partner");
  if (!current) return { ok: false, error: "No Partner Agreement is published yet" };

  // Needs the service role to read operator contact details across tenants.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error: "Notifications aren't configured in this environment (no service role key).",
    };
  }
  const admin = createAdminClient();

  // Approved operators → their owner/manager users → contact details.
  const { data: vendors } = await admin.from("vendors").select("id, name").eq("status", "approved");
  const vendorName = new Map((vendors ?? []).map((v) => [v.id, v.name]));
  const vendorIds = (vendors ?? []).map((v) => v.id);
  if (vendorIds.length === 0) {
    await markAnnounced(admin, current.id);
    return {
      ok: true,
      message: "No approved operators to notify yet. Version marked as announced.",
    };
  }

  const { data: staff } = await admin
    .from("vendor_staff")
    .select("user_id, vendor_id, role, is_active")
    .in("vendor_id", vendorIds)
    .in("role", ["vendor_owner", "vendor_manager"])
    .eq("is_active", true);

  const byUser = new Map<string, string>(); // user_id → vendor name (first seen)
  for (const s of staff ?? []) {
    if (!byUser.has(s.user_id))
      byUser.set(s.user_id, vendorName.get(s.vendor_id) ?? "your operator");
  }
  const userIds = [...byUser.keys()];
  if (userIds.length === 0) {
    await markAnnounced(admin, current.id);
    return {
      ok: true,
      message: "No operator owners/managers to notify. Version marked as announced.",
    };
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, phone")
    .in("id", userIds);
  const recipients: Recipient[] = (profiles ?? []).map((p) => ({
    userId: p.id,
    vendorName: byUser.get(p.id) ?? "your operator",
    email: p.email,
    phone: p.phone,
  }));

  const agreementUrl = `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard/agreement`;
  let emailsSent = 0;
  let waSent = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of recipients) {
    if (r.email) {
      const msg = partnerAgreementUpdatedEmail({
        vendorName: r.vendorName,
        version: current.version,
        agreementUrl,
      });
      const res = await sendEmail({ to: r.email, ...msg });
      if (res.ok) emailsSent++;
      else if (res.configured) failed++;
      else skipped++;
      await recordNotification(admin, r.userId, "email", r.email, current.version, res);
    }
    if (r.phone) {
      const res = await sendWhatsApp(
        r.phone,
        partnerAgreementUpdatedSms({ version: current.version, agreementUrl }),
      );
      if (res.ok) waSent++;
      else if (res.configured) failed++;
      else skipped++;
      await recordNotification(admin, r.userId, "whatsapp", r.phone, current.version, res);
    }
  }

  await markAnnounced(admin, current.id);
  revalidatePath("/dashboard/agreements/partner");

  const parts = [`${emailsSent} email(s)`, `${waSent} WhatsApp message(s)`];
  let message = `Notified ${recipients.length} operator contact(s): ${parts.join(" and ")} sent.`;
  if (skipped > 0) message += ` ${skipped} skipped (channel not configured).`;
  if (failed > 0) message += ` ${failed} failed to send.`;
  return { ok: true, message };
}

type Admin = ReturnType<typeof createAdminClient>;

async function markAnnounced(admin: Admin, agreementId: string): Promise<void> {
  await admin
    .from("agreements")
    .update({ announced_at: new Date().toISOString() })
    .eq("id", agreementId);
}

async function recordNotification(
  admin: Admin,
  userId: string,
  channel: "email" | "whatsapp",
  recipient: string,
  version: number,
  res:
    | { ok: true; providerMessageId: string | null }
    | { ok: false; reason: string; configured: boolean },
): Promise<void> {
  const status = res.ok ? "sent" : res.configured ? "failed" : "skipped";
  await admin.from("notifications").insert({
    user_id: userId,
    booking_id: null,
    channel,
    template: "partner_agreement_updated",
    recipient,
    payload: { agreement_version: version },
    status,
    error: res.ok ? null : res.reason,
    provider_message_id: res.ok ? res.providerMessageId : null,
    sent_at: res.ok ? new Date().toISOString() : null,
  });
}
