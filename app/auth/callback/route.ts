import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Magic link callback : Supabase redirige ici après que l'utilisateur a cliqué
 * sur son lien email. Échange le `code` en session, set les cookies, et redirige
 * vers `next` (ou `/`).
 *
 * Si erreur (token expiré, déjà utilisé, etc.), redirige vers /auth/error avec
 * le détail dans l'URL.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const { origin, searchParams } = url;

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const errorUrl = new URL("/auth/error", origin);
    errorUrl.searchParams.set("error", error);
    if (errorDescription) errorUrl.searchParams.set("description", errorDescription);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL("/auth/error", origin);
    errorUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const errorUrl = new URL("/auth/error", origin);
    errorUrl.searchParams.set("error", "exchange_failed");
    errorUrl.searchParams.set("description", exchangeError.message);
    return NextResponse.redirect(errorUrl);
  }

  // Validation simple du paramètre `next` pour éviter open redirect
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, origin));
}
