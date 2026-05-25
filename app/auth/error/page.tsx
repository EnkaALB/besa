import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Mapping des erreurs Supabase Auth vers des messages clairs.
 * On regarde `error_code` (spécifique) en priorité, puis `error` (générique).
 *
 * Note : "access_denied" arrive souvent avec `error_code=otp_expired` ou
 * `error_code=otp_consumed`. Sans le code spécifique, on ne peut pas dire
 * si l'user a vraiment refusé ou si c'est juste un lien périmé.
 */
const MESSAGES: Record<string, { title: string; body: string }> = {
  // error_code (Supabase spécifique)
  otp_expired: {
    title: "Le lien a expiré.",
    body: "Les magic links restent valides 1 heure après envoi. Demande-en un nouveau.",
  },
  otp_consumed: {
    title: "Le lien a déjà été utilisé.",
    body: "Chaque magic link ne fonctionne qu'une seule fois. Demande-en un nouveau.",
  },
  otp_disabled: {
    title: "Connexion par lien désactivée.",
    body: "Le magic link email n'est pas activé sur ce projet. Contacte le support.",
  },
  unexpected_failure: {
    title: "Erreur côté Supabase.",
    body: "Quelque chose a échoué dans la chaîne d'authentification. Réessaie dans quelques minutes.",
  },

  // error (haut niveau)
  access_denied: {
    title: "Le lien n'est plus valide.",
    body: "Il a probablement expiré (1 heure) ou a déjà été utilisé. Demande-en un nouveau.",
  },
  server_error: {
    title: "Erreur serveur.",
    body: "Une erreur serveur s'est produite. Réessaie dans quelques instants.",
  },

  // Custom (mon code)
  missing_code: {
    title: "Le lien est incomplet.",
    body: "L'URL ne contient pas le code d'authentification. Demande-en un nouveau.",
  },
  exchange_failed: {
    title: "L'échange a échoué.",
    body: "Le code n'a pas pu être converti en session. Le lien a peut-être déjà été utilisé.",
  },
};

const FALLBACK = {
  title: "Le lien n'est plus valide.",
  body: "Une erreur d'authentification est survenue. Demande un nouveau lien.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    description?: string;
  }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const errorCode = params.error_code ?? params.error ?? "unknown";

  // Priorité : error_code (spécifique) > error (générique) > fallback
  const entry =
    (params.error_code && MESSAGES[params.error_code]) ||
    (params.error && MESSAGES[params.error]) ||
    null;

  const title = entry?.title ?? FALLBACK.title;
  const body = entry?.body ?? params.description ?? FALLBACK.body;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>

        <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">{title}</h1>

        <p className="text-muted-foreground leading-relaxed">{body}</p>

        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Code : {errorCode}
        </p>

        <Button asChild>
          <Link href="/login">Redemander un lien</Link>
        </Button>
      </div>
    </main>
  );
}
