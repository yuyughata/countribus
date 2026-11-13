import { z } from "zod";

/**
 * Nigerian phone number. Accepts local (0803...) or international (+234803...)
 * formats and normalises to E.164 (+234...).
 */
export const nigerianPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?234|0)\d{10}$/u, "Enter a valid Nigerian phone number")
  .transform((v) => {
    const digits = v.replace(/\D/gu, "");
    if (digits.startsWith("234")) return `+${digits}`;
    if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
    return `+${digits}`;
  });

/** URL-safe slug for vendor portal addresses. */
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use lowercase letters, numbers and hyphens");

export const uuid = z.string().uuid();
