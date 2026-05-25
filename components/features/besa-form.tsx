"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createBesa } from "@/lib/actions/besa";
import { weightLabel } from "@/lib/validators/besa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface BesaFormProps {
  defaultDeadline: string; // valeur YYYY-MM-DDTHH:mm pour input datetime-local
}

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

export function BesaForm({ defaultDeadline }: BesaFormProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [weight, setWeight] = useState(5);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 3) {
      toast.error("Titre trop court", { description: "Au moins 3 caractères." });
      return;
    }

    if (!deadline) {
      toast.error("Échéance manquante");
      return;
    }

    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      toast.error("Échéance invalide");
      return;
    }
    if (deadlineDate.getTime() <= Date.now() + 60_000) {
      toast.error("L'échéance doit être dans le futur");
      return;
    }

    startTransition(async () => {
      const result = await createBesa({
        title: title.trim(),
        description: description.trim(),
        deadline: deadlineDate.toISOString(),
        weight_ressenti: weight,
      });

      // Si OK, createBesa a appelé redirect() → on n'arrive pas ici.
      if (result && !result.ok) {
        toast.error("Création impossible", { description: result.error });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Titre de la besa</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Rendre le manuscrit avant l'été"
          maxLength={TITLE_MAX}
          required
          autoFocus
          disabled={isPending}
        />
        <p className="text-right text-xs text-muted-foreground">
          {title.length} / {TITLE_MAX}
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnelle)</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ce qui est précisément engagé. Le contexte. Ce qui compte."
          rows={4}
          maxLength={DESCRIPTION_MAX}
          disabled={isPending}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <p className="text-right text-xs text-muted-foreground">
          {description.length} / {DESCRIPTION_MAX}
        </p>
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label htmlFor="deadline">Échéance</Label>
        <Input
          id="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          À cette date, vous serez tous les deux invités à valider si elle a été tenue.
        </p>
      </div>

      {/* Weight slider */}
      <div className="space-y-4 rounded-lg border border-border bg-secondary/50 p-5">
        <div className="space-y-2">
          <Label htmlFor="weight">À quel point cet engagement compte pour toi ?</Label>
          <p className="text-xs text-muted-foreground">
            Tu poses ton poids ressenti. Ton co-signataire posera le sien en aveugle. La
            moyenne servira de base pour calculer l&apos;impact sur ton Besa Score.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Slider
            id="weight"
            value={[weight]}
            onValueChange={(v) => setWeight(v[0] ?? 5)}
            min={1}
            max={10}
            step={1}
            disabled={isPending}
            aria-label="Poids ressenti"
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Anodin</span>
            <span className="font-serif text-3xl text-foreground tabular-nums leading-none">
              {weight}
            </span>
            <span>Sacré</span>
          </div>

          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            {weightLabel(weight)}
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !title.trim()}>
        {isPending ? "Création…" : "Créer la besa et obtenir un lien"}
      </Button>
    </form>
  );
}
