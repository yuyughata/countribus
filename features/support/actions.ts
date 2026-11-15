"use server";

import { revalidatePath } from "next/cache";

import { firstManageableVendorId, requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { TicketMessage } from "@/features/support/queries";

export type Result = { ok: true; id?: string } | { ok: false; error: string };

export const CUSTOMER_CATEGORIES = ["feedback", "complaint", "assistance"] as const;
export const OPERATOR_CATEGORIES = ["technical", "platform", "billing", "other"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

function revalidate() {
  revalidatePath("/support");
  revalidatePath("/dashboard/support");
}

/** Raise a support ticket (customer: feedback/complaint/assistance; operator:
 *  technical/platform/billing). Stores the first message as the body. */
export async function createTicket(input: {
  authorKind: "customer" | "operator";
  category: string;
  subject: string;
  body: string;
  bookingId?: string | null;
}): Promise<Result> {
  const ctx = await requireUser();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) return { ok: false, error: "Add a subject" };
  if (!body) return { ok: false, error: "Describe your issue" };

  const allowed: readonly string[] =
    input.authorKind === "operator" ? OPERATOR_CATEGORIES : CUSTOMER_CATEGORIES;
  const category = allowed.includes(input.category) ? input.category : allowed[0];

  const supabase = await createClient();
  let vendorId: string | null = null;
  const bookingId = input.bookingId || null;

  if (input.authorKind === "operator") {
    vendorId = firstManageableVendorId(ctx);
  } else if (bookingId) {
    // Attach the booking's operator so complaints count toward them.
    const { data: b } = await supabase
      .from("bookings")
      .select("vendor_id")
      .eq("id", bookingId)
      .maybeSingle();
    vendorId = b?.vendor_id ?? null;
  }

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      created_by: ctx.userId,
      author_kind: input.authorKind,
      category,
      vendor_id: vendorId,
      booking_id: bookingId,
      subject,
    })
    .select("id")
    .single();
  if (error || !ticket) return { ok: false, error: error?.message ?? "Could not create ticket" };

  const { error: msgErr } = await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    author_id: ctx.userId,
    is_admin: ctx.isPlatformAdmin,
    body,
  });
  if (msgErr) return { ok: false, error: msgErr.message };

  revalidate();
  return { ok: true, id: ticket.id };
}

/** Load a ticket's thread (RLS: creator or admin). */
export async function loadTicketThread(
  ticketId: string,
): Promise<{ ok: true; messages: TicketMessage[] } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, body, is_admin, author_id, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, messages: (data ?? []) as TicketMessage[] };
}

/** Post a reply to a ticket. Admin replies move an 'open' ticket to in_progress. */
export async function replyToTicket(ticketId: string, body: string): Promise<Result> {
  const ctx = await requireUser();
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a reply" };
  const supabase = await createClient();
  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    author_id: ctx.userId,
    is_admin: ctx.isPlatformAdmin,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  if (ctx.isPlatformAdmin) {
    await supabase
      .from("support_tickets")
      .update({ status: "in_progress" })
      .eq("id", ticketId)
      .eq("status", "open");
  }
  revalidate();
  return { ok: true };
}

/** Change a ticket's status (admin only). */
export async function setTicketStatus(ticketId: string, status: string): Promise<Result> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) return { ok: false, error: "Only an admin can change ticket status" };
  if (!TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticketId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
