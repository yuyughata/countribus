import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validation/auth";
import { nigerianPhone, slug } from "@/lib/validation/common";
import { addStaffSchema, vendorApplicationSchema } from "@/lib/validation/vendors";

describe("validation", () => {
  describe("nigerianPhone", () => {
    it("normalises local format to E.164", () => {
      expect(nigerianPhone.parse("08031234567")).toBe("+2348031234567");
    });
    it("accepts international format", () => {
      expect(nigerianPhone.parse("+2348031234567")).toBe("+2348031234567");
    });
    it("rejects invalid numbers", () => {
      expect(nigerianPhone.safeParse("12345").success).toBe(false);
    });
  });

  describe("slug", () => {
    it("accepts valid slugs and rejects spaces/caps", () => {
      expect(slug.parse("Peace-Mass")).toBe("peace-mass");
      expect(slug.safeParse("bad slug!").success).toBe(false);
      expect(slug.safeParse("ab").success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("requires an 8+ char password", () => {
      const base = { fullName: "Ada Obi", email: "ada@example.com", phone: "08031234567" };
      expect(registerSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
      expect(registerSchema.safeParse({ ...base, password: "longenough" }).success).toBe(true);
    });
  });

  describe("vendor schemas", () => {
    it("accepts a valid vendor application", () => {
      const r = vendorApplicationSchema.safeParse({
        name: "Alpha Transit",
        slug: "alpha-transit",
        contactEmail: "ops@alpha.ng",
        contactPhone: "08031234567",
      });
      expect(r.success).toBe(true);
    });

    it("never lets a vendor directly add an owner role", () => {
      expect(
        addStaffSchema.safeParse({ userId: crypto.randomUUID(), role: "vendor_owner" }).success,
      ).toBe(false);
      expect(
        addStaffSchema.safeParse({ userId: crypto.randomUUID(), role: "booking_officer" }).success,
      ).toBe(true);
    });
  });
});
