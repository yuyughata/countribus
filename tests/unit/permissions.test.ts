import { describe, expect, it } from "vitest";

import {
  ROLES,
  VEHICLE_MANAGEMENT_FORBIDDEN_ROLES,
  can,
  capabilitiesFor,
  isVendorScoped,
  type Role,
} from "@/lib/permissions/roles";

describe("permissions matrix", () => {
  it("restricts vehicle:manage to super_admin, vendor_owner and vendor_manager (plan §3)", () => {
    const allowed: Role[] = ["super_admin", "vendor_owner", "vendor_manager"];
    for (const role of ROLES) {
      expect(can(role, "vehicle:manage")).toBe(allowed.includes(role));
    }
  });

  it("never grants vehicle:manage to terminal staff or passengers", () => {
    for (const role of VEHICLE_MANAGEMENT_FORBIDDEN_ROLES) {
      expect(can(role, "vehicle:manage")).toBe(false);
    }
    expect(can("terminal_staff", "vehicle:manage")).toBe(false);
    expect(can("passenger", "vehicle:manage")).toBe(false);
  });

  it("restricts walk-in counter sales to owner/manager/booking officer (+ super admin)", () => {
    const allowed: Role[] = ["super_admin", "vendor_owner", "vendor_manager", "booking_officer"];
    for (const role of ROLES) {
      expect(can(role, "booking:counter")).toBe(allowed.includes(role));
    }
    // Terminal staff and passengers must never record counter bookings.
    expect(can("terminal_staff", "booking:counter")).toBe(false);
    expect(can("passenger", "booking:counter")).toBe(false);
  });

  it("restricts staff-incentive management to vendor owner (+ super admin)", () => {
    const allowed: Role[] = ["super_admin", "vendor_owner"];
    for (const role of ROLES) {
      expect(can(role, "incentive:manage")).toBe(allowed.includes(role));
    }
    expect(can("vendor_manager", "incentive:manage")).toBe(false);
    expect(can("booking_officer", "incentive:manage")).toBe(false);
  });

  it("lets terminal staff view (but not manage) vehicles", () => {
    expect(can("terminal_staff", "vehicle:view")).toBe(true);
    expect(can("terminal_staff", "vehicle:manage")).toBe(false);
  });

  it("gives super_admin every capability", () => {
    expect(can("super_admin", "finance:manage")).toBe(true);
    expect(can("super_admin", "payment:refund")).toBe(true);
    expect(can("super_admin", "audit:view")).toBe(true);
  });

  it("does not let passengers access management capabilities", () => {
    expect(can("passenger", "booking:view")).toBe(false);
    expect(can("passenger", "schedule:manage")).toBe(false);
    expect(capabilitiesFor("passenger")).toEqual(["booking:create"]);
  });

  it("classifies vendor tenant roles correctly", () => {
    expect(isVendorScoped("vendor_owner")).toBe(true);
    expect(isVendorScoped("terminal_staff")).toBe(true);
    expect(isVendorScoped("super_admin")).toBe(false);
    expect(isVendorScoped("passenger")).toBe(false);
  });
});
