import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  isSuccessStatus,
  verifyFlutterwaveWebhook,
  verifyPaystackWebhook,
} from "@/lib/payments/providers";

const secret = "sk_test_secret";

function paystackBody(amountKobo: number, status = "success") {
  return JSON.stringify({
    event: "charge.success",
    data: { id: 123456, reference: "CB-ABCD1234", amount: amountKobo, status },
  });
}

describe("paystack webhook verification", () => {
  it("accepts a correctly-signed payload and extracts the amount in kobo", () => {
    const body = paystackBody(2_000_000);
    const sig = createHmac("sha512", secret).update(body).digest("hex");
    const v = verifyPaystackWebhook(secret, body, sig);
    expect(v.valid).toBe(true);
    if (v.valid) {
      expect(v.amountKobo).toBe(2_000_000);
      expect(v.reference).toBe("CB-ABCD1234");
      expect(v.eventId).toBe("paystack:123456");
    }
  });

  it("rejects a tampered payload (signature no longer matches)", () => {
    const body = paystackBody(2_000_000);
    const sig = createHmac("sha512", secret).update(body).digest("hex");
    const tampered = paystackBody(1); // attacker lowers the amount
    expect(verifyPaystackWebhook(secret, tampered, sig).valid).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyPaystackWebhook(secret, paystackBody(100), null).valid).toBe(false);
  });
});

describe("flutterwave webhook verification", () => {
  it("accepts a matching verif-hash and converts naira to kobo", () => {
    const body = JSON.stringify({
      data: { id: 99, tx_ref: "CB-XYZ", amount: 20000, status: "successful" },
    });
    const v = verifyFlutterwaveWebhook("hash123", body, "hash123");
    expect(v.valid).toBe(true);
    if (v.valid) expect(v.amountKobo).toBe(2_000_000);
  });

  it("rejects a wrong verif-hash", () => {
    const body = JSON.stringify({
      data: { id: 99, tx_ref: "CB-XYZ", amount: 20000, status: "successful" },
    });
    expect(verifyFlutterwaveWebhook("hash123", body, "nope").valid).toBe(false);
  });
});

describe("isSuccessStatus", () => {
  it("maps provider-specific success strings", () => {
    expect(isSuccessStatus("paystack", "success")).toBe(true);
    expect(isSuccessStatus("paystack", "failed")).toBe(false);
    expect(isSuccessStatus("flutterwave", "successful")).toBe(true);
    expect(isSuccessStatus("flutterwave", "success")).toBe(false);
  });
});
