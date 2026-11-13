import { describe, expect, it } from "vitest";

import {
  addMoney,
  commissionSplit,
  formatKobo,
  koboToNaira,
  money,
  nairaToKobo,
} from "@/lib/money";

describe("money (kobo integer units)", () => {
  it("rejects non-integer minor units", () => {
    expect(() => money(100.5)).toThrow();
  });

  it("converts naira <-> kobo without float drift", () => {
    expect(nairaToKobo(123.45)).toBe(12345);
    expect(koboToNaira(12345)).toBe(123.45);
  });

  it("adds money of the same currency", () => {
    expect(addMoney(money(1000), money(2500)).amount).toBe(3500);
  });

  it("refuses to add mismatched currencies", () => {
    const ngn = money(1000);
    const other = { amount: 500, currency: "USD" as unknown as "NGN" };
    expect(() => addMoney(ngn, other)).toThrow();
  });

  it("formats kobo as Naira currency", () => {
    expect(formatKobo(1234500)).toContain("12,345.00");
  });

  describe("commissionSplit", () => {
    it("splits gross into commission + vendor net (integer kobo)", () => {
      const { commissionKobo, vendorNetKobo } = commissionSplit(100000, 1000); // 10%
      expect(commissionKobo).toBe(10000);
      expect(vendorNetKobo).toBe(90000);
      expect(commissionKobo + vendorNetKobo).toBe(100000);
    });

    it("never loses a kobo to rounding", () => {
      const gross = 99999;
      const { commissionKobo, vendorNetKobo } = commissionSplit(gross, 750); // 7.5%
      expect(commissionKobo + vendorNetKobo).toBe(gross);
    });

    it("validates rate bounds", () => {
      expect(() => commissionSplit(1000, -1)).toThrow();
      expect(() => commissionSplit(1000, 10001)).toThrow();
    });
  });
});
