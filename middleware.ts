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

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Pas de Supabase configuré → on laisse passer (utile en dev minimal)
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

  // Toujours rafraîchir la session (recommandation Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publik = isPublicPath(pathname);

  // Route publique : on laisse passer (session déjà rafraîchie)
  if (publik) {
    return supabaseResponse;
  }

  // Pas authentifié sur route privée → /login
  if (!user) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  // Authentifié : check onboarding
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
    // Tous les paths sauf assets statiques et favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
