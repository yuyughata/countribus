import { describe, expect, it } from "vitest";

import {
  canForVendor,
  canPlatform,
  hasVendorAccess,
  roleForVendor,
  type AuthContext,
} from "@/lib/auth/access";

const VENDOR_A = "a0000000-0000-0000-0000-000000000001";
const VENDOR_B = "b0000000-0000-0000-0000-000000000002";

function ctx(partial: Partial<AuthContext>): AuthContext {
  return {
    userId: "u1",
    email: "u1@example.com",
    isPlatformAdmin: false,
    memberships: [],
    ...partial,
  };
}

describe("auth access resolution", () => {
  it("treats a platform admin as super_admin for any vendor", () => {
    const admin = ctx({ isPlatformAdmin: true });
    expect(roleForVendor(admin, VENDOR_A)).toBe("super_admin");
    expect(canForVendor(admin, VENDOR_A, "vehicle:manage")).toBe(true);
    expect(canPlatform(admin, "vendor:approve")).toBe(true);
  });

  it("resolves the membership role for the matching vendor only", () => {
    const owner = ctx({ memberships: [{ vendorId: VENDOR_A, role: "vendor_owner" }] });
    expect(roleForVendor(owner, VENDOR_A)).toBe("vendor_owner");
    expect(roleForVendor(owner, VENDOR_B)).toBeNull();
  });

  it("enforces the vehicle-management boundary via membership role", () => {
    const manager = ctx({ memberships: [{ vendorId: VENDOR_A, role: "vendor_manager" }] });
    const terminal = ctx({ memberships: [{ vendorId: VENDOR_A, role: "terminal_staff" }] });
    expect(canForVendor(manager, VENDOR_A, "vehicle:manage")).toBe(true);
    expect(canForVendor(terminal, VENDOR_A, "vehicle:manage")).toBe(false);
    expect(canForVendor(terminal, VENDOR_A, "vehicle:view")).toBe(true);
  });

  it("denies capabilities for a vendor the user has no membership in (cross-vendor)", () => {
    const owner = ctx({ memberships: [{ vendorId: VENDOR_A, role: "vendor_owner" }] });
    expect(canForVendor(owner, VENDOR_B, "booking:view")).toBe(false);
    expect(hasVendorAccess(owner, VENDOR_B)).toBe(false);
    expect(hasVendorAccess(owner, VENDOR_A)).toBe(true);
  });

  it("does not grant platform capabilities to a non-admin", () => {
    const owner = ctx({ memberships: [{ vendorId: VENDOR_A, role: "vendor_owner" }] });
    expect(canPlatform(owner, "vendor:approve")).toBe(false);
  });
});
