"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";
import { checkUsernameAvailable, submitOnboarding } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UsernameCheckResult =
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "invalid"; message: string };

type UsernameStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | UsernameCheckResult;

const DEBOUNCE_MS = 400;
const BIO_MAX = 280;

interface OnboardingFormProps {
  userId: string;
  email: string;
  initialUsername: string;
}

export function OnboardingForm({
  userId,
  email,
  initialUsername,
}: OnboardingFormProps): React.JSX.Element {
  const [username, setUsername] = useState(initialUsername);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [lastCheck, setLastCheck] = useState<
    { username: string; result: UsernameCheckResult } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const candidate = username.trim().toLowerCase();

  // Aperçu de l'avatar dérivé du fichier sélectionné (URL.createObjectURL).
  // Cleanup automatique : on revoke l'URL quand le fichier change ou que le composant unmount.
  const avatarPreview = useMemo<string | null>(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  // Debounced username availability check : on déclenche un timeout, et la seule
  // mise à jour d'état dans l'effet est ASYNC (dans le setTimeout) — pas de
  // setState synchrone dans le corps de l'effet (cf. react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!candidate) return;
    if (lastCheck?.username === candidate) return; // déjà vérifié

    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailable(candidate);
      const result: UsernameCheckResult = res.available
        ? { kind: "available" }
        : res.reason
          ? { kind: "invalid", message: res.reason }
          : { kind: "taken" };
      setLastCheck({ username: candidate, result });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [candidate, lastCheck]);

  // Status dérivé : idle si vide, checking si en attente du résultat, sinon le dernier résultat.
  const usernameStatus = useMemo<UsernameStatus>(() => {
    if (!candidate) return { kind: "idle" };
    if (lastCheck?.username !== candidate) return { kind: "checking" };
    return lastCheck.result;
  }, [candidate, lastCheck]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setAvatarFile(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image trop lourde", { description: "Maximum 2 Mo." });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté", { description: "JPG, PNG, WebP ou GIF." });
      return;
    }
    setAvatarFile(file);
  }

  async function uploadAvatarIfAny(): Promise<string | null> {
    if (!avatarFile) return null;

    const supabase = createClient();
    const ext = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    if (usernameStatus.kind !== "available") {
      toast.error("Vérifie d'abord ton pseudo");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Ton nom est requis");
      return;
    }

    startTransition(async () => {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatarIfAny();
        } catch (err) {
          toast.error("Avatar non uploadé", {
            description: err instanceof Error ? err.message : "Erreur inconnue",
          });
          // On continue sans l'avatar
        }
      }

      const result = await submitOnboarding({
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });

      // Si succès, submitOnboarding redirige (throw RedirectError) — code en dessous non atteint.
      if (result && !result.ok) {
        toast.error("Sauvegarde impossible", { description: result.error });
      }
    });
  }

  const usernameMessage = (() => {
    switch (usernameStatus.kind) {
      case "checking":
        return <span className="text-muted-foreground">Vérification…</span>;
      case "available":
        return <span className="text-foreground">Disponible.</span>;
      case "taken":
        return <span className="text-destructive">Déjà pris.</span>;
      case "invalid":
        return <span className="text-destructive">{usernameStatus.message}</span>;
      default:
        return null;
    }
  })();

  const avatarInitials =
    fullName
      .trim()
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || email.charAt(0).toUpperCase() || "?";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative"
          aria-label="Choisir un avatar"
        >
          <Avatar className="h-24 w-24 transition-opacity group-hover:opacity-80">
            {avatarPreview ? <AvatarImage src={avatarPreview} alt="Aperçu" /> : null}
            <AvatarFallback className="font-serif text-2xl">{avatarInitials}</AvatarFallback>
          </Avatar>
          <span className="mt-2 block text-xs text-muted-foreground transition-colors group-hover:text-foreground">
            {avatarFile ? "Changer la photo" : "Ajouter une photo (optionnel)"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username">Pseudo</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
          }
          required
          autoComplete="off"
          placeholder="jean-dupont"
          maxLength={30}
          disabled={isPending}
        />
        <p className="min-h-[1.25rem] text-xs">
          {usernameMessage ?? (
            <span className="text-muted-foreground">
              C&apos;est ton URL publique : besa.app/u/{username || "ton-pseudo"}
            </span>
          )}
        </p>
      </div>

      {/* Full name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">Nom complet</Label>
        <Input
          id="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          placeholder="Jean Dupont"
          maxLength={100}
          disabled={isPending}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio (optionnelle)</Label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="Une ligne sur toi."
          disabled={isPending}
          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <p className="text-right text-xs text-muted-foreground">
          {bio.length} / {BIO_MAX}
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={
          isPending ||
          usernameStatus.kind !== "available" ||
          !fullName.trim()
        }
      >
        {isPending ? "Création…" : "Créer mon profil"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">Connecté en tant que {email}</p>
    </form>
  );
}
