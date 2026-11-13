import { z } from "zod";

/**
 * Centralised, validated environment access.
 *
 * - Public values (NEXT_PUBLIC_*) are safe for the browser.
 * - Server secrets must never be imported into a client component. Accessing
 *   `serverEnv()` from client code will throw because the variables are absent.
 *
 * Plan §13/§14: service role key, payment secrets and messaging credentials are
 * server-only and must never reach the browser or be committed.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Payments (test keys in development). Optional until Phase 5.
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_HASH: z.string().optional(),
  // Transactional email (Phase 7 notifications). Optional until provisioned;
  // when absent, confirmation emails are recorded as `skipped`, never failed.
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATIONS_FROM_EMAIL: z.string().email().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let _public: PublicEnv | null = null;

/** Validated public env, usable on client and server. */
export function publicEnv(): PublicEnv {
  if (_public) return _public;
  _public = publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  return _public;
}

let _server: ServerEnv | null = null;

/** Validated server-only env. Throws if called from the browser bundle. */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser.");
  }
  if (_server) return _server;
  _server = serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET,
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_WEBHOOK_HASH: process.env.FLUTTERWAVE_WEBHOOK_HASH,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NOTIFICATIONS_FROM_EMAIL: process.env.NOTIFICATIONS_FROM_EMAIL,
  });
  return _server;
}
