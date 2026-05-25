"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { signBesa } from "@/lib/actions/besa";
import { weightLabel } from "@/lib/validators/besa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface BesaSigningCardProps {
  token: string;
  besa: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
  };
  creator: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

type FormState =
  | { phase: "input"; weight: number }
  | { phase: "submitting" }
  | {
      phase: "revealed";
      besaId: string;
      creatorWeight: number;
      cosignerWeight: number;
      weightFinal: number;
    };

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function creatorInitials(fullName: string | null, username: string | null): string {
  if (fullName) {
    return (
      fullName
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join("") || "?"
    );
  }
  return (username?.[0]?.toUpperCase() ?? "?").slice(0, 1);
}

export function BesaSigningCard({
  token,
  besa,
  creator,
}: BesaSigningCardProps): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ phase: "input", weight: 5 });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (state.phase !== "input") return;
    const weight = state.weight;

    startTransition(async () => {
      setState({ phase: "submitting" });

      const result = await signBesa({ token, weight_ressenti: weight });

      if (!result.ok) {
        toast.error("Signature impossible", { description: result.error });
        setState({ phase: "input", weight });
        return;
      }

      setState({
        phase: "revealed",
        besaId: result.besaId,
        creatorWeight: result.creatorWeight,
        cosignerWeight: result.cosignerWeight,
        weightFinal: result.weightFinal,
      });
    });
  }

  // ---------- REVEALED ----------
  if (state.phase === "revealed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-xl space-y-12 text-center">
          <p
            className="animate-fade-up text-xs uppercase tracking-[0.3em] text-muted-foreground"
            style={{ animationDelay: "0ms" }}
          >
            Besa scellée
          </p>

          <h1
            className="animate-fade-up font-serif text-3xl font-light leading-tight tracking-tight md:text-4xl"
            style={{ animationDelay: "200ms" }}
          >
            {besa.title}
          </h1>

          <div className="grid grid-cols-2 gap-6">
            <div
              className="animate-fade-up space-y-2 rounded-lg border border-border bg-secondary/30 p-6"
              style={{ animationDelay: "600ms" }}
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Le créateur
              </p>
              <p className="font-serif text-5xl tabular-nums">{state.creatorWeight}</p>
              <p className="text-xs text-muted-foreground">
                {weightLabel(state.creatorWeight)}
              </p>
            </div>
            <div
              className="animate-fade-up space-y-2 rounded-lg border border-border bg-secondary/30 p-6"
              style={{ animationDelay: "1000ms" }}
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Toi</p>
              <p className="font-serif text-5xl tabular-nums">{state.cosignerWeight}</p>
              <p className="text-xs text-muted-foreground">
                {weightLabel(state.cosignerWeight)}
              </p>
            </div>
          </div>

          <div
            className="animate-fade-up space-y-2 border-t border-border pt-8"
            style={{ animationDelay: "1500ms" }}
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Poids final
            </p>
            <p className="font-serif text-7xl text-primary tabular-nums">
              {state.weightFinal.toFixed(1)}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => router.push(`/besa/${state.besaId}`)}
            className="animate-fade-up"
            style={{ animationDelay: "2000ms" }}
          >
            Voir la besa
          </Button>
        </div>
      </main>
    );
  }

  // ---------- SUBMITTING ----------
  if (state.phase === "submitting") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="text-center">
          <p className="animate-pulse-soft text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Scellage en cours…
          </p>
        </div>
      </main>
    );
  }

  // ---------- INPUT ----------
  const creatorDisplay = creator.full_name ?? creator.username ?? "Quelqu'un";

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-24">
      <div className="w-full max-w-xl space-y-10">
        {/* Creator card */}
        <div className="flex items-center justify-center gap-4">
          <Avatar className="h-16 w-16">
            {creator.avatar_url ? (
              <AvatarImage src={creator.avatar_url} alt={creatorDisplay} />
            ) : null}
            <AvatarFallback className="font-serif text-lg">
              {creatorInitials(creator.full_name, creator.username)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Te propose une besa
            </p>
            <p className="font-serif text-xl">{creatorDisplay}</p>
            {creator.username ? (
              <p className="text-xs text-muted-foreground">@{creator.username}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>

        {/* Besa content */}
        <div className="space-y-4 text-center">
          <h1 className="font-serif text-3xl font-light leading-tight tracking-tight md:text-4xl">
            {besa.title}
          </h1>
          {besa.description ? (
            <p className="mx-auto max-w-md text-muted-foreground leading-relaxed">
              {besa.description}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Échéance : <span className="text-foreground">{formatDeadline(besa.deadline)}</span>
          </p>
        </div>

        {/* Signing form */}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-secondary/30 p-6">
          <div className="space-y-2 text-center">
            <p className="font-medium">À quel point cette besa compte pour toi ?</p>
            <p className="text-xs text-muted-foreground">
              Tu poses ton poids en aveugle. Celui du créateur sera révélé à la signature.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Slider
              value={[state.weight]}
              onValueChange={(v) => setState({ phase: "input", weight: v[0] ?? 5 })}
              min={1}
              max={10}
              step={1}
              disabled={isPending}
              aria-label="Poids ressenti"
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Anodin</span>
              <span className="font-serif text-3xl text-foreground tabular-nums leading-none">
                {state.weight}
              </span>
              <span>Sacré</span>
            </div>

            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
              {weightLabel(state.weight)}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            Donner ma besa
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          En signant, tu acceptes que cette besa apparaisse dans ton historique et impacte ton
          Besa Score à l&apos;échéance.
        </p>
      </div>
    </main>
  );
}
