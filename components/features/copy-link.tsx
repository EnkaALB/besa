"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CopyLinkProps {
  /** URL complète à copier (calculée côté serveur depuis les headers). */
  url: string;
}

export function CopyLink({ url }: CopyLinkProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier", {
        description: "Sélectionne et copie manuellement.",
      });
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={url}
        className="font-mono text-xs"
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Lien d'invitation"
      />
      <Button type="button" onClick={handleCopy} variant="outline">
        {copied ? "Copié ✓" : "Copier"}
      </Button>
    </div>
  );
}
