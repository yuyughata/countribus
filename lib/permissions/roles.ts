/**
 * Role & capability model (plan §3).
 *
 * This is the single source of truth for coarse capability gating. It does NOT
 * replace the two mandatory enforcement layers:
 *   1. Server-side authorization on every mutation/sensitive read.
 *   2. Supabase Row Level Security for tenant (vendor) isolation.
 *
 * "Hiding a button is not authorization." Use `can()` to drive UI affordances
 * AND to guard server actions, but tenant scoping (vendor_id match) is enforced
 * separately in the data layer.
 */

export const ROLES = [
  "super_admin",
  "vendor_owner",
  "vendor_manager",
  "booking_officer",
  "terminal_staff",
  "luggage_officer",
  "finance_officer",
  "passenger",
] as const;

export type Role = (typeof ROLES)[number];

/** Roles that belong to a vendor organisation (tenant-scoped). */
export const VENDOR_SCOPED_ROLES: Role[] = [
  "vendor_owner",
  "vendor_manager",
  "booking_officer",
  "terminal_staff",
  "luggage_officer",
  "finance_officer",
];

export const CAPABILITIES = [
  "platform:manage", // platform-wide admin controls
  "vendor:approve", // approve/suspend vendors
  "vendor:manage_own", // edit own vendor profile
  "staff:manage", // manage vendor staff & their roles
  "vehicle:manage", // create/edit/deactivate vehicles + seat templates (RESTRICTED)
  "vehicle:view", // view vehicle details
  "route:manage",
  "schedule:manage",
  "schedule:publish",
  "booking:create",
  "booking:manage", // cancel/reissue under policy
  "booking:view", // view bookings/manifests for own vendor
  "manifest:view",
  "manifest:export",
  "ticket:verify",
  "boarding:scan",
  "luggage:scan",
  "finance:view",
  "finance:manage",
  "payment:refund",
  "notification:send",
  "audit:view",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Role → capabilities matrix.
 *
 * CRITICAL (plan §3): `vehicle:manage` and seat-template configuration are
 * available ONLY to super_admin, vendor_owner and vendor_manager. Terminal
 * staff and passengers must never receive it. Terminal staff get `vehicle:view`
 * (limited, for an assigned trip) but never `vehicle:manage`.
 */
const MATRIX: Record<Role, readonly Capability[]> = {
  super_admin: CAPABILITIES, // everything (sensitive actions are additionally audited)
  vendor_owner: [
    "vendor:manage_own",
    "staff:manage",
    "vehicle:manage",
    "vehicle:view",
    "route:manage",
    "schedule:manage",
    "schedule:publish",
    "booking:create",
    "booking:manage",
    "booking:view",
    "manifest:view",
    "manifest:export",
    "ticket:verify",
    "boarding:scan",
    "luggage:scan",
    "finance:view",
    "notification:send",
  ],
  vendor_manager: [
    "vehicle:manage",
    "vehicle:view",
    "route:manage",
    "schedule:manage",
    "schedule:publish",
    "booking:create",
    "booking:manage",
    "booking:view",
    "manifest:view",
    "manifest:export",
    "ticket:verify",
    "boarding:scan",
    "luggage:scan",
    "staff:manage",
  ],
  booking_officer: [
    "booking:create",
    "booking:manage",
    "booking:view",
    "vehicle:view",
    "manifest:view",
    "ticket:verify",
  ],
  terminal_staff: [
    "vehicle:view",
    "manifest:view",
    "ticket:verify",
    "boarding:scan",
    "luggage:scan",
  ],
  luggage_officer: ["manifest:view", "luggage:scan", "vehicle:view"],
  finance_officer: ["finance:view", "booking:view", "manifest:view"],
  passenger: ["booking:create"],
};

/** Capabilities that must always be absent from terminal staff & passengers. */
export const VEHICLE_MANAGEMENT_FORBIDDEN_ROLES: Role[] = [
  "terminal_staff",
  "luggage_officer",
  "finance_officer",
  "booking_officer",
  "passenger",
];

/** Does a role hold a capability? */
export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

/** All capabilities for a role (copy). */
export function capabilitiesFor(role: Role): Capability[] {
  return [...(MATRIX[role] ?? [])];
}

/** Does a role belong to a vendor tenant? */
export function isVendorScoped(role: Role): boolean {
  return VENDOR_SCOPED_ROLES.includes(role);
}
