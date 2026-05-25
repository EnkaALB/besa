"use client";

import { useTransition } from "react";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton(): React.JSX.Element {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
    >
      {isPending ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
