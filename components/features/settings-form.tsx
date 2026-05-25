"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";
import { checkUsernameAvailable } from "@/app/onboarding/actions";
import { updateProfile } from "@/app/settings/actions";
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

interface SettingsFormProps {
  userId: string;
  email: string;
  initial: {
    username: string;
    full_name: string;
    bio: string;
    avatar_url: string | null;
    score_visible_public: boolean;
  };
}

export function SettingsForm({
  userId,
  email,
  initial,
}: SettingsFormProps): React.JSX.Element {
  const [username, setUsername] = useState(initial.username);
  const [fullName, setFullName] = useState(initial.full_name);
  const [bio, setBio] = useState(initial.bio);
  const [scoreVisible, setScoreVisible] = useState(initial.score_visible_public);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(initial.avatar_url);
  const [lastCheck, setLastCheck] = useState<
    { username: string; result: UsernameCheckResult } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const candidate = username.trim().toLowerCase();
  const usernameUnchanged = candidate === initial.username;

  const avatarPreview = useMemo<string | null>(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => {
    if (!candidate || usernameUnchanged) return;
    if (lastCheck?.username === candidate) return;

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
  }, [candidate, lastCheck, usernameUnchanged]);

  const usernameStatus = useMemo<UsernameStatus>(() => {
    if (!candidate) return { kind: "idle" };
    if (usernameUnchanged) return { kind: "idle" };
    if (lastCheck?.username !== candidate) return { kind: "checking" };
    return lastCheck.result;
  }, [candidate, lastCheck, usernameUnchanged]);

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
      toast.error("Format non supporté");
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
    return `${data.publicUrl}?t=${Date.now()}`; // cache-bust pour voir le nouveau avatar immédiatement
  }

  async function removeAvatar(): Promise<void> {
    if (!currentAvatarUrl) return;
    if (!confirm("Supprimer ta photo de profil ?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ avatar_url: null })
      .eq("id", userId);
    if (error) {
      toast.error("Suppression impossible", { description: error.message });
      return;
    }
    setCurrentAvatarUrl(null);
    setAvatarFile(null);
    toast.success("Photo supprimée.");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    if (!usernameUnchanged && usernameStatus.kind !== "available") {
      toast.error("Vérifie d'abord ton pseudo");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Ton nom est requis");
      return;
    }

    startTransition(async () => {
      let avatarUrl: string | null = currentAvatarUrl;
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatarIfAny();
        } catch (err) {
          toast.error("Avatar non uploadé", {
            description: err instanceof Error ? err.message : "Erreur inconnue",
          });
          return;
        }
      }

      const result = await updateProfile({
        username: candidate,
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        score_visible_public: scoreVisible,
      });

      if (!result.ok) {
        toast.error("Sauvegarde impossible", { description: result.error });
        return;
      }

      setCurrentAvatarUrl(avatarUrl);
      setAvatarFile(null);
      setLastCheck(null);
      toast.success("Profil mis à jour.");
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

  const displayedAvatar = avatarPreview ?? currentAvatarUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-6">
        <h2 className="font-serif text-xl tracking-tight">Profil</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group"
            aria-label="Changer l'avatar"
          >
            <Avatar className="h-20 w-20 transition-opacity group-hover:opacity-80">
              {displayedAvatar ? (
                <AvatarImage src={displayedAvatar} alt="Avatar" />
              ) : null}
              <AvatarFallback className="font-serif text-xl">{avatarInitials}</AvatarFallback>
            </Avatar>
          </button>
          <div className="flex flex-col gap-1 text-sm">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-foreground underline-offset-4 hover:underline"
            >
              Changer la photo
            </button>
            {currentAvatarUrl ? (
              <button
                type="button"
                onClick={removeAvatar}
                className="text-left text-muted-foreground transition-colors hover:text-destructive"
              >
                Supprimer
              </button>
            ) : null}
          </div>
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
            maxLength={30}
            disabled={isPending}
          />
          <p className="min-h-[1.25rem] text-xs">
            {usernameMessage ?? (
              <span className="text-muted-foreground">
                Ton URL : besa.app/u/{username || "ton-pseudo"}
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
            maxLength={100}
            disabled={isPending}
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            rows={3}
            disabled={isPending}
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
          <p className="text-right text-xs text-muted-foreground">
            {bio.length} / {BIO_MAX}
          </p>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-serif text-xl tracking-tight">Visibilité</h2>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={scoreVisible}
            onChange={(e) => setScoreVisible(e.target.checked)}
            disabled={isPending}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Afficher mon Besa Score publiquement</span>
            <span className="block text-xs text-muted-foreground">
              Ton score apparaîtra sur ta page publique /u/{username}. Tes besas restent privées
              par défaut — tu choisis lesquelles rendre publiques.
            </span>
          </span>
        </label>
      </section>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sauvegarde…" : "Sauvegarder"}
      </Button>
    </form>
  );
}
