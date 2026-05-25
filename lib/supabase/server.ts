import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client pour les Server Components, Server Actions, Route Handlers.
 * Lit/écrit la session via les cookies Next.js. Soumis à RLS (auth.uid()).
 *
 * Note : dans les Server Components purs, l'écriture de cookies échoue
 * silencieusement (impossible techniquement). La refresh est gérée par middleware.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component context : l'API cookies() interdit l'écriture.
          // Le refresh sera fait par middleware.ts au prochain navigate.
        }
      },
    },
  });
}
