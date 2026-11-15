import type { VendorRole } from "@/lib/supabase/database.types";

/** Human labels for the vendor-scoped roles (shared across the team UI). */
export const VENDOR_ROLE_LABEL: Record<VendorRole, string> = {
  vendor_owner: "Vendor Owner",
  vendor_manager: "Vendor Manager",
  booking_officer: "Booking Officer",
  terminal_staff: "Terminal Staff",
  luggage_officer: "Luggage Officer",
  finance_officer: "Finance Officer",
};

/** Roles an owner/manager may assign to a team member (owner included). */
export const ASSIGNABLE_ROLES: VendorRole[] = [
  "vendor_owner",
  "vendor_manager",
  "booking_officer",
  "terminal_staff",
  "luggage_officer",
  "finance_officer",
];

/** Roles that can be invited by email (ownership is granted in-app, not invited). */
export const INVITABLE_ROLES: VendorRole[] = [
  "vendor_manager",
  "booking_officer",
  "terminal_staff",
  "luggage_officer",
  "finance_officer",
];
