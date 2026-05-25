import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Routes accessibles sans authentification
const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/auth/error"];
const PUBLIC_PREFIXES = ["/u/", "/b/"]; // profils publics et atterrissage besa

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Next.js 16 a renommé `middleware` en `proxy` (cf. nextjs.org/docs/messages/middleware-to-proxy).
 * Rôle :
 *  - Rafraîchir la session Supabase sur chaque navigation (recommandation Supabase)
 *  - Forcer la redirection vers `/onboarding` si l'utilisateur n'a pas encore choisi son username
 *  - Bloquer l'accès aux routes privées si non authentifié
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publik = isPublicPath(pathname);

  if (publik) {
    return supabaseResponse;
  }

  if (!user) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const isOnboarded = profile?.username != null;
  const onOnboarding = pathname === "/onboarding";

  if (!isOnboarded && !onOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isOnboarded && onOnboarding) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
