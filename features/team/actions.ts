"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { canForVendor, requireUser, roleForVendor } from "@/lib/auth/context";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notifications/email";
import { teamInviteEmail } from "@/lib/notifications/templates";
import {
  ASSIGNABLE_ROLES,
  INVITABLE_ROLES,
  VENDOR_ROLE_LABEL,
} from "@/lib/permissions/role-labels";
import type { VendorRole } from "@/lib/supabase/database.types";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireStaffManage(vendorId: string) {
  const ctx = await requireUser();
  if (!canForVendor(ctx, vendorId, "staff:manage")) throw new Error("forbidden");
  const canAssignOwner = ctx.isPlatformAdmin || roleForVendor(ctx, vendorId) === "vendor_owner";
  return { ctx, canAssignOwner };
}

/** Change an existing team member's role (owner/manager; owner-mint guarded). */
export async function setStaffRole(
  vendorId: string,
  userId: string,
  role: VendorRole,
): Promise<Result> {
  let canAssignOwner = false;
  try {
    ({ canAssignOwner } = await requireStaffManage(vendorId));
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  if (!ASSIGNABLE_ROLES.includes(role)) return { ok: false, error: "Unknown role" };
  if (role === "vendor_owner" && !canAssignOwner) {
    return { ok: false, error: "Only an owner can assign the Owner role." };
  }

  const supabase = await createClient();
  const { data: team } = await supabase.rpc("vendor_staff_list", { p_vendor: vendorId });
  const members = (team ?? []) as { user_id: string; role: VendorRole; is_active: boolean }[];
  const target = members.find((m) => m.user_id === userId);
  if (!target) return { ok: false, error: "Team member not found" };

  // A manager may not modify an owner, and the last owner can't be demoted.
  if (target.role === "vendor_owner") {
    if (!canAssignOwner) return { ok: false, error: "Only an owner can change an owner's role." };
    if (role !== "vendor_owner") {
      const otherOwners = members.filter(
        (m) => m.role === "vendor_owner" && m.is_active && m.user_id !== userId,
      ).length;
      if (otherOwners === 0) return { ok: false, error: "You can't remove the last owner." };
    }
  }

  const { error } = await supabase
    .from("vendor_staff")
    .update({ role })
    .eq("vendor_id", vendorId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/permissions");
  return { ok: true, message: "Role updated." };
}

/** Invite a new team member by email and assign a role. */
export async function inviteMember(
  vendorId: string,
  emailRaw: string,
  role: VendorRole,
): Promise<Result> {
  let ctx;
  try {
    ({ ctx } = await requireStaffManage(vendorId));
  } catch {
    return { ok: false, error: "Not allowed" };
  }
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address" };
  if (!INVITABLE_ROLES.includes(role)) {
    return { ok: false, error: "That role can't be invited. Assign it after they join." };
  }

  const supabase = await createClient();

  // Already on the team?
  const { data: team } = await supabase.rpc("vendor_staff_list", { p_vendor: vendorId });
  if ((team ?? []).some((m) => (m.email ?? "").toLowerCase() === email)) {
    return { ok: false, error: "That email is already a team member." };
  }

  // Replace any existing pending invite for this email, then create a fresh one.
  await supabase
    .from("vendor_invitations")
    .delete()
    .eq("vendor_id", vendorId)
    .eq("email", email)
    .eq("status", "pending");

  const token = randomBytes(18).toString("hex");
  const { error } = await supabase.from("vendor_invitations").insert({
    vendor_id: vendorId,
    email,
    role,
    token,
    invited_by: ctx.userId,
  });
  if (error) return { ok: false, error: error.message };

  // Send the invitation email (best-effort).
  const { data: vendor } = await supabase
    .from("vendors")
    .select("name")
    .eq("id", vendorId)
    .maybeSingle();
  const inviteUrl = `${publicEnv().NEXT_PUBLIC_APP_URL}/invite/${token}`;
  const res = await sendEmail({
    to: email,
    ...teamInviteEmail({
      vendorName: vendor?.name ?? "your operator",
      roleLabel: VENDOR_ROLE_LABEL[role],
      inviteUrl,
    }),
  });

  revalidatePath("/dashboard/permissions");
  const sent = res.ok
    ? "Invitation emailed."
    : res.configured
      ? "Invite created, but the email failed to send."
      : "Invite created. Email isn't configured yet, so share the link from the pending list.";
  return { ok: true, message: sent };
}

/** Revoke a pending invitation. */
export async function revokeInvite(invitationId: string): Promise<Result> {
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("vendor_invitations")
    .select("vendor_id, status")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Invitation not found" };
  if (!canForVendor(ctx, inv.vendor_id, "staff:manage")) return { ok: false, error: "Not allowed" };

  const { error } = await supabase
    .from("vendor_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/permissions");
  return { ok: true, message: "Invitation revoked." };
}

/** Accept an invitation by token (the signed-in user's email must match). */
export async function acceptInvite(token: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_vendor_invitation", { p_token: token });
  if (error) {
    const m = /INVITE:(\w+)/.exec(error.message)?.[1];
    const msg =
      m === "email_mismatch"
        ? "This invitation is for a different email. Sign in with the invited email."
        : m === "expired"
          ? "This invitation has expired. Ask the operator to resend it."
          : m === "not_found"
            ? "This invitation is no longer valid."
            : error.message;
    return { ok: false, error: msg };
  }
  revalidatePath("/dashboard");
  return { ok: true, message: "You've joined the team." };
}
