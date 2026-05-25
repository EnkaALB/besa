"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm(): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });

    setIsLoading(false);

    if (error) {
      toast.error("Le lien n'a pas pu être envoyé", { description: error.message });
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex justify-center">
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
            Vérifie ton inbox.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Un lien vient d&apos;être envoyé à{" "}
            <strong className="text-foreground font-medium">{email}</strong>.
            <br />
            Clique dessus pour te connecter.
          </p>
          <p className="text-xs text-muted-foreground">
            Le lien expire dans 1 heure et ne fonctionne qu&apos;une fois.
          </p>
          <Button variant="ghost" onClick={() => setSent(false)}>
            Renvoyer un lien
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
            Te connecter.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Reçois un lien sur ton email. Pas de mot de passe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              placeholder="toi@exemple.com"
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !email}>
            {isLoading ? "Envoi…" : "Recevoir le lien"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            ← Retour
          </Link>
        </p>
      </div>
    </main>
  );
}
