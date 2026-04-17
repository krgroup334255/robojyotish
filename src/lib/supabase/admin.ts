import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Admin/service-role client. Bypasses RLS.
 * NEVER import this into client components.
 */
export function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
