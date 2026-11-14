import { z } from "zod";

/** Admin promo-code form. Money fields are entered in naira; stored as kobo. */
export const promoCodeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Code must be at least 3 characters")
    .max(32)
    .regex(/^[A-Z0-9]+$/, "Use letters and numbers only (no spaces)"),
  description: z.string().trim().max(200).optional(),
  discountPercent: z.number().int().min(1, "At least 1%").max(100, "At most 100%"),
  minFareNaira: z.number().min(0).default(0),
  maxDiscountNaira: z.number().min(0).nullable().optional(),
  maxRedemptions: z.number().int().min(1).nullable().optional(),
  maxPerCustomer: z.number().int().min(1).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type PromoCodeInput = z.infer<typeof promoCodeInputSchema>;

/** Admin referral-program config. */
export const referralProgramInputSchema = z.object({
  isEnabled: z.boolean(),
  referrerPercent: z.number().int().min(1, "At least 1%").max(100, "At most 100%"),
  minQualifyingFareNaira: z.number().min(0).default(0),
  rewardMaxDiscountNaira: z.number().min(0).nullable().optional(),
  rewardValidityDays: z.number().int().min(1).nullable().optional(),
});
export type ReferralProgramInput = z.infer<typeof referralProgramInputSchema>;
