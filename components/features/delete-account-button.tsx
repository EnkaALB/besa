"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteAccount } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONFIRM_PHRASE = "SUPPRIMER";

export function DeleteAccountButton(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const isReady = confirmInput === CONFIRM_PHRASE;

  function handleDelete(): void {
    if (!isReady) {
      toast.error(`Tape "${CONFIRM_PHRASE}" pour confirmer`);
      return;
    }

    startTransition(async () => {
      try {
        await deleteAccount();
        // Si succès, deleteAccount appelle redirect() → on n'arrive pas ici
      } catch (err) {
        // Server Actions qui redirect throw NEXT_REDIRECT — c'est attendu
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        if (msg.includes("NEXT_REDIRECT")) {
          // Normal flow, redirect en cours
          return;
        }
        toast.error("Suppression impossible", { description: msg });
      }
    });
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setExpanded(true)}
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Supprimer mon compte
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Cette action est définitive.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ton profil sera anonymisé (« Compte supprimé »), tes données personnelles effacées.
          Les besas que tu as signées restent — leur impact sur le score de tes co-signataires
          ne peut pas être retiré rétroactivement.
        </p>
        <p className="text-xs text-muted-foreground">
          Pour confirmer, tape <strong className="text-foreground">{CONFIRM_PHRASE}</strong> :
        </p>
      </div>

      <Input
        value={confirmInput}
        onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
        placeholder={CONFIRM_PHRASE}
        disabled={isPending}
        autoFocus
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={handleDelete}
          disabled={!isReady || isPending}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isPending ? "Suppression…" : "Supprimer définitivement"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setExpanded(false);
            setConfirmInput("");
          }}
          disabled={isPending}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
