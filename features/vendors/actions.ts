"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canForVendor, canPlatform, requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  addStaffSchema,
  vendorApplicationSchema,
  vendorDecisionSchema,
} from "@/lib/validation/vendors";

export type VendorActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };

/**
 * Submit a vendor application. The applicant becomes the pending vendor's owner
 * (bootstrap). RLS + the DB guards also enforce this; the server check is
 * defence in depth and gives a friendly error.
 */
export async function createVendorApplication(
  input: unknown,
): Promise<VendorActionResult<{ vendorId: string }>> {
  const ctx = await requireUser();
  const parsed = vendorApplicationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };

  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("vendors")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone,
      created_by: ctx.userId,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !vendor) {
    return { ok: false, error: error?.message ?? "Could not create the vendor" };
  }

  const { error: staffError } = await supabase.from("vendor_staff").insert({
    vendor_id: vendor.id,
    user_id: ctx.userId,
    role: "vendor_owner",
  });
  if (staffError) return { ok: false, error: staffError.message };

  revalidatePath("/dashboard/vendors");
  return { ok: true, data: { vendorId: vendor.id } };
}

/** Platform-admin decision on a vendor application (approve / reject / suspend). */
export async function decideVendor(input: unknown): Promise<VendorActionResult> {
  const ctx = await requireUser();
  const parsed = vendorDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  if (!canPlatform(ctx, "vendor:approve")) {
    return { ok: false, error: "Only a platform admin can decide vendor applications" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({
      status: parsed.data.decision,
      approved_by: parsed.data.decision === "approved" ? ctx.userId : null,
      approved_at: parsed.data.decision === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.vendorId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/vendors");
  return { ok: true, data: undefined };
}

/** Add a staff member to a vendor (owner/manager only; never an owner role). */
export async function addVendorStaff(
  vendorId: string,
  input: unknown,
): Promise<VendorActionResult> {
  const ctx = await requireUser();
  const parsed = addStaffSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };

  if (!canForVendor(ctx, vendorId, "staff:manage")) {
    return { ok: false, error: "You cannot manage staff for this vendor" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vendor_staff").insert({
    vendor_id: vendorId,
    user_id: parsed.data.userId,
    role: parsed.data.role,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/vendors");
  return { ok: true, data: undefined };
}

// --- Form-bound wrappers (for useActionState) -------------------------------

export type OnboardState = { error: string } | null;

/** Vendor onboarding form submit → create application, then go to the list. */
export async function onboardVendorAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const res = await createVendorApplication({
    name: formData.get("name"),
    slug: formData.get("slug"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
  });
  if (!res.ok) return { error: res.error };
  redirect("/dashboard/vendors");
}
