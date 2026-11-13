import { z } from "zod";

import { nigerianPhone, slug, uuid } from "@/lib/validation/common";

const VENDOR_STAFF_ROLES = [
  "vendor_manager",
  "booking_officer",
  "terminal_staff",
  "luggage_officer",
  "finance_officer",
] as const;

export const vendorApplicationSchema = z.object({
  name: z.string().trim().min(2, "Enter the operator name").max(120),
  slug,
  contactEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  contactPhone: nigerianPhone,
});

/**
 * Staff a vendor can add directly. `vendor_owner` is intentionally excluded —
 * ownership is assigned only via the bootstrap or platform admin (mirrors the
 * DB guard `guard_vendor_staff_owner`).
 */
export const addStaffSchema = z.object({
  userId: uuid,
  role: z.enum(VENDOR_STAFF_ROLES),
});

export const vendorDecisionSchema = z.object({
  vendorId: uuid,
  decision: z.enum(["approved", "rejected", "suspended"]),
});

export type VendorApplicationInput = z.infer<typeof vendorApplicationSchema>;
export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type VendorDecisionInput = z.infer<typeof vendorDecisionSchema>;
