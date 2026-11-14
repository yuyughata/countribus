import { z } from "zod";

export const payoutAccountSchema = z.object({
  bankCode: z.string().trim().min(1, "Choose a bank"),
  bankName: z.string().trim().min(1, "Choose a bank"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Account number must be 10 digits"),
  accountName: z.string().trim().max(120).optional(),
});
export type PayoutAccountInput = z.infer<typeof payoutAccountSchema>;
