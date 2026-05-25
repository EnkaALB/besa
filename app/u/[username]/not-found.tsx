import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProfileNotFound(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>
        <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
          Personne ici.
        </h1>
        <p className="text-muted-foreground">Ce pseudo n&apos;existe pas (ou plus).</p>
        <Button asChild variant="ghost">
          <Link href="/">← Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </main>
  );
}
