"use server";

import { createClient } from "@/lib/supabase/server";
import { newsletterSchema } from "@/lib/validation/newsletter";

export type SubscribeResult = { ok: true } | { ok: false; error: string };

/**
 * Capture a mailing-list subscription from the public "Never miss an update"
 * form. The email is validated server-side and upserted with
 * "on conflict do nothing", so re-subscribing is idempotent and never reveals
 * whether an address is already on the list. Anonymous inserts are permitted by
 * RLS (newsletter_insert); the list itself stays admin-only.
 */
export async function subscribeNewsletter(
  _prev: SubscribeResult | null,
  formData: FormData,
): Promise<SubscribeResult> {
  const parsed = newsletterSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: parsed.data.email, source: "homepage" });

  // A duplicate email (23505) means they're already subscribed — treat as
  // success so re-subscribing is idempotent and never reveals list membership.
  // We use a plain insert rather than an upsert because anonymous visitors have
  // INSERT but not SELECT on the table, and "on conflict do nothing" would need
  // SELECT; the unique-violation path needs only INSERT.
  if (error && error.code !== "23505") {
    return { ok: false, error: "Could not subscribe right now. Please try again." };
  }

  return { ok: true };
}
