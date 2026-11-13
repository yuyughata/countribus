import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 *
 * SECURITY (plan §13/§14):
 * - Server-only. The `server-only` import makes a client bundle fail to build
 *   if this module is ever imported into browser code.
 * - Use ONLY for trusted system operations (e.g. webhook processing, seed
 *   scripts) where authorization has already been enforced in code.
 * - Never expose results to a user without an explicit server-side check.
 */
export function createAdminClient() {
  const pub = publicEnv();
  const srv = serverEnv();
  return createSupabaseClient<Database>(
    pub.NEXT_PUBLIC_SUPABASE_URL,
    srv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
