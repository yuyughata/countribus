import { createHmac, timingSafeEqual } from "node:crypto";

import { koboToNaira } from "@/lib/money";
import type { PaymentProvider } from "@/lib/supabase/database.types";

/**
 * Payment provider integration (plan §7). All initialization is server-side;
 * webhook signatures are verified before any booking is confirmed. Amounts are
 * kobo internally; Paystack uses kobo, Flutterwave uses naira.
 */

export type InitInput = {
  amountKobo: number;
  email: string;
  reference: string;
  callbackUrl: string;
};

export type InitResult = { ok: true; checkoutUrl: string } | { ok: false; error: string };

export type WebhookVerification =
  | { valid: true; eventId: string; reference: string; amountKobo: number; status: string }
  | { valid: false; reason: string };

type ProviderConfig = {
  paystackSecret?: string;
  flutterwaveSecret?: string;
  flutterwaveHash?: string;
};

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// --- Paystack ---------------------------------------------------------------
async function paystackInit(secret: string, input: InitInput): Promise<InitResult> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo, // Paystack expects kobo
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    status: boolean;
    message?: string;
    data?: { authorization_url: string };
  } | null;
  if (!res.ok || !json?.status || !json.data?.authorization_url) {
    return { ok: false, error: json?.message ?? "Paystack initialization failed" };
  }
  return { ok: true, checkoutUrl: json.data.authorization_url };
}

export function verifyPaystackWebhook(
  secret: string,
  rawBody: string,
  signature: string | null,
): WebhookVerification {
  if (!signature) return { valid: false, reason: "missing signature" };
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  if (!constantTimeEqual(expected, signature)) return { valid: false, reason: "bad signature" };
  const evt = JSON.parse(rawBody) as {
    event: string;
    data: { id: number | string; reference: string; amount: number; status: string };
  };
  return {
    valid: true,
    eventId: `paystack:${evt.data.id}`,
    reference: evt.data.reference,
    amountKobo: evt.data.amount, // kobo
    status: evt.data.status,
  };
}

// --- Flutterwave ------------------------------------------------------------
async function flutterwaveInit(secret: string, input: InitInput): Promise<InitResult> {
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: koboToNaira(input.amountKobo), // Flutterwave expects naira
      currency: "NGN",
      redirect_url: input.callbackUrl,
      customer: { email: input.email },
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    status: string;
    message?: string;
    data?: { link: string };
  } | null;
  if (!res.ok || json?.status !== "success" || !json.data?.link) {
    return { ok: false, error: json?.message ?? "Flutterwave initialization failed" };
  }
  return { ok: true, checkoutUrl: json.data.link };
}

export function verifyFlutterwaveWebhook(
  configuredHash: string,
  rawBody: string,
  verifHash: string | null,
): WebhookVerification {
  if (!verifHash || !constantTimeEqual(configuredHash, verifHash)) {
    return { valid: false, reason: "bad verif-hash" };
  }
  const evt = JSON.parse(rawBody) as {
    data: { id: number | string; tx_ref: string; amount: number; status: string };
  };
  return {
    valid: true,
    eventId: `flutterwave:${evt.data.id}`,
    reference: evt.data.tx_ref,
    amountKobo: Math.round(evt.data.amount * 100), // naira -> kobo
    status: evt.data.status,
  };
}

// --- Dispatch ---------------------------------------------------------------
export async function initializePayment(
  provider: PaymentProvider,
  cfg: ProviderConfig,
  input: InitInput,
): Promise<InitResult> {
  if (provider === "paystack") {
    if (!cfg.paystackSecret) return { ok: false, error: "Paystack is not configured" };
    return paystackInit(cfg.paystackSecret, input);
  }
  if (!cfg.flutterwaveSecret) return { ok: false, error: "Flutterwave is not configured" };
  return flutterwaveInit(cfg.flutterwaveSecret, input);
}

/** A provider payment status string that means the transaction succeeded. */
export function isSuccessStatus(provider: PaymentProvider, status: string): boolean {
  const s = status.toLowerCase();
  return provider === "paystack" ? s === "success" : s === "successful";
}
