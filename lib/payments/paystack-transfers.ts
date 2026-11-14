import "server-only";

/**
 * Paystack Transfers API — vendor settlement. Server-only; the secret key is
 * read from the environment. When unconfigured, callers degrade gracefully
 * (accounts can be saved but stay unverified; payouts stay scheduled).
 */

export type PaystackResult<T> = { ok: true; data: T } | { ok: false; error: string };

function secretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

export function transfersConfigured(): boolean {
  return secretKey() !== null;
}

async function call<T>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<PaystackResult<T>> {
  const key = secretKey();
  if (!key) return { ok: false, error: "Paystack is not configured" };
  try {
    const res = await fetch(`https://api.paystack.co${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: T;
    };
    if (!res.ok || json.status === false || json.data == null) {
      return { ok: false, error: json.message ?? `Paystack error ${res.status}` };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export type Bank = { name: string; code: string };

/** Major Nigerian banks — fallback list so the UI works before Paystack is live. */
export const FALLBACK_BANKS: Bank[] = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "Opay", code: "999992" },
  { name: "Palmpay", code: "999991" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank For Africa (UBA)", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

export async function listBanks(): Promise<Bank[]> {
  if (!transfersConfigured()) return FALLBACK_BANKS;
  const r = await call<Bank[]>("/bank?currency=NGN&country=nigeria", "GET");
  if (!r.ok || r.data.length === 0) return FALLBACK_BANKS;
  return r.data.map((b) => ({ name: b.name, code: b.code }));
}

/** Resolve an account number to its registered name. */
export async function resolveAccount(
  accountNumber: string,
  bankCode: string,
): Promise<PaystackResult<{ account_name: string }>> {
  return call<{ account_name: string }>(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    "GET",
  );
}

/** Create a transfer recipient; returns its recipient_code for later transfers. */
export async function createTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<PaystackResult<{ recipient_code: string }>> {
  return call<{ recipient_code: string }>("/transferrecipient", "POST", {
    type: "nuban",
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: "NGN",
  });
}

/** Initiate a transfer from the Paystack balance to a recipient. */
export async function initiateTransfer(input: {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason: string;
}): Promise<PaystackResult<{ transfer_code: string; status: string }>> {
  return call<{ transfer_code: string; status: string }>("/transfer", "POST", {
    source: "balance",
    amount: input.amountKobo,
    recipient: input.recipientCode,
    reference: input.reference,
    reason: input.reason,
  });
}
