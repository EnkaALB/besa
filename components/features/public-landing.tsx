import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PublicLanding(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl space-y-12 text-center">
        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Besa
        </p>

        <h1 className="text-5xl font-light leading-[1.05] tracking-tight text-foreground md:text-6xl">
          La parole donnée.
        </h1>

        <p className="mx-auto max-w-md text-lg leading-relaxed text-muted-foreground">
          Une besa est un engagement co-signé entre deux parties. Quelque chose qu&apos;on
          tient. Une trace, dans le temps, de ce qu&apos;on a su faire.
        </p>

        <div className="flex flex-col items-center gap-4 pt-4">
          <Button asChild size="lg" className="h-12 px-8 text-base">
            <Link href="/login">Commencer</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Aucun mot de passe. Tu reçois un lien sur ton email.
          </p>
        </div>

        <div className="flex justify-center pt-8">
          <span className="inline-block rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground">
            MVP en construction
          </span>
        </div>
      </div>
    </main>
  );
}
