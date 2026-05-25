import Link from "next/link";

import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Le lien semble incomplet. Demande-en un nouveau.",
  exchange_failed: "Le lien n'a pas pu être validé. Il a peut-être déjà été utilisé ou expiré.",
  access_denied: "Tu as refusé l'accès. Aucun souci, tu peux réessayer.",
  otp_expired: "Le lien a expiré (1 heure). Demande-en un nouveau.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; description?: string }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const errorCode = params.error ?? "unknown";
  const customMessage = ERROR_MESSAGES[errorCode];
  const description = customMessage ?? params.description ?? "Une erreur d'authentification est survenue.";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>

        <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
          Le lien n&apos;est plus valide.
        </h1>

        <p className="text-muted-foreground leading-relaxed">{description}</p>

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
