/**
 * Money handling for Countribus.
 *
 * Plan §5: "All money values use integer minor units (kobo) plus explicit
 * currency; never use floating-point arithmetic for money."
 *
 * The canonical representation across the app, API and database is an integer
 * number of kobo (1 NGN = 100 kobo). Never store or compute money as a float.
 */

export const DEFAULT_CURRENCY = "NGN" as const;

export type Currency = "NGN";

export interface Money {
  /** Amount in minor units (kobo for NGN). Always an integer. */
  amount: number;
  currency: Currency;
}

export function money(amount: number, currency: Currency = DEFAULT_CURRENCY): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money amount must be an integer number of minor units, got ${amount}`);
  }
  return { amount, currency };
}

/** Convert a whole-naira value to kobo. Accepts up to 2 decimal places. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Convert kobo to a naira number (for display/formatting only). */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a kobo integer as a Naira currency string, e.g. 1234500 -> "₦12,345.00". */
export function formatKobo(kobo: number): string {
  return nairaFormatter.format(koboToNaira(kobo));
}

/** Add money values of the same currency. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} + ${b.currency}`);
  }
  return money(a.amount + b.amount, a.currency);
}

/**
 * Compute a commission split from a gross amount (kobo) and a basis-points rate.
 * Using basis points keeps the rate an integer and avoids float drift.
 * e.g. 1000 bps = 10%.
 */
export function commissionSplit(
  grossKobo: number,
  rateBps: number,
): { commissionKobo: number; vendorNetKobo: number } {
  if (!Number.isInteger(grossKobo) || grossKobo < 0) {
    throw new Error(`grossKobo must be a non-negative integer, got ${grossKobo}`);
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new Error(`rateBps must be an integer in [0, 10000], got ${rateBps}`);
  }
  const commissionKobo = Math.round((grossKobo * rateBps) / 10_000);
  return { commissionKobo, vendorNetKobo: grossKobo - commissionKobo };
}
