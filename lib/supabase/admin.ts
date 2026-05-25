import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Admin client utilisant la clé service_role.
 * Bypass RLS — pouvoir TOTAL sur la base.
 *
 * ATTENTION : ne JAMAIS importer ce fichier dans un Client Component.
 * À utiliser uniquement dans des Route Handlers ou Server Actions
 * qui ont vraiment besoin de bypass RLS (ex : cron jobs, calcul de score
 * orchestré côté serveur, anonymisation de compte).
 *
 * Pour les opérations user-context normales, utiliser `lib/supabase/server.ts`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing admin Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
