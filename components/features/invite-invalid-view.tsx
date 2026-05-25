import Link from "next/link";

import { Button } from "@/components/ui/button";

type InvalidReason = "not_found" | "expired" | "used" | "already_active" | "self";

const MESSAGES: Record<InvalidReason, { title: string; body: string }> = {
  not_found: {
    title: "Ce lien n'existe pas.",
    body: "Vérifie que tu as copié l'URL complète. Sinon, demande un nouveau lien à la personne qui te l'a envoyé.",
  },
  expired: {
    title: "Ce lien a expiré.",
    body: "Les liens d'invitation expirent après 7 jours. Demande-en un nouveau.",
  },
  used: {
    title: "Ce lien a déjà été utilisé.",
    body: "Une seule personne peut signer chaque besa. Si tu es cette personne, retrouve-la dans ton tableau de bord.",
  },
  already_active: {
    title: "Cette besa est déjà active.",
    body: "Elle a déjà été scellée. Le lien d'invitation n'a plus d'usage.",
  },
  self: {
    title: "On ne peut pas signer sa propre besa.",
    body: "Une besa scelle un engagement entre deux personnes. Partage ce lien avec quelqu'un d'autre.",
  },
};

export function InviteInvalidView({ reason }: { reason: InvalidReason }): React.JSX.Element {
  const { title, body } = MESSAGES[reason];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>
        <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">{title}</h1>
        <p className="text-muted-foreground leading-relaxed">{body}</p>
        <Button asChild variant="ghost">
          <Link href="/">← Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </main>
  );
}
