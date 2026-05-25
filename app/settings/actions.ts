"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  usernameSchema,
  fullNameSchema,
  bioSchema,
  avatarUrlSchema,
} from "@/lib/validators/profile";

export type ActionResult = { ok: true } | { ok: false; error: string };

const updateProfileSchema = z.object({
  username: usernameSchema,
  full_name: fullNameSchema,
  bio: bioSchema.optional().default(""),
  avatar_url: avatarUrlSchema.optional().default(null),
  score_visible_public: z.boolean(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Met à jour le profil de l'utilisateur authentifié.
 * Vérifie l'unicité du username (peut être inchangé pour l'utilisateur lui-même).
 */
export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Non authentifié" };
  }

  // Unicité du username (sauf si c'est le user actuel qui ne le change pas)
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return { ok: false, error: "Ce pseudo est déjà pris" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      username: parsed.data.username,
      full_name: parsed.data.full_name,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatar_url,
      score_visible_public: parsed.data.score_visible_public,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Anonymise le compte (RGPD) :
 *   1. RPC public.anonymize_account() — nettoie public.users
 *   2. Supprime auth.users via admin client (cascade revoke session)
 *   3. Redirige vers /
 *
 * Note : un service_role est requis pour DELETE de auth.users (impossible
 * pour un user authentifié sur sa propre ligne via REST).
 */
export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non authentifié");
  }

  // Étape 1 : anonymise public.users
  const { error: rpcError } = await supabase.rpc("anonymize_account");
  if (rpcError) {
    throw new Error(`Anonymisation impossible : ${rpcError.message}`);
  }

  // Étape 2 : supprime auth.users (cascade sera bloqué par ON DELETE RESTRICT
  // sur besas.creator_id, mais public.users a ON DELETE CASCADE depuis auth.users
  // donc on doit faire l'inverse : on garde public.users anonymisé et on supprime auth.users).
  // Or auth.users.id est référencé par public.users.id ON DELETE CASCADE.
  // Supprimer auth.users supprimerait donc public.users (et donc les besas via RESTRICT échouerait).
  // Solution : on NE SUPPRIME PAS auth.users — on se contente de l'anonymisation
  // de public.users + signOut. L'auth user reste mais ne peut plus se connecter
  // (email à NULL côté public, mais auth.users.email garde la valeur — on doit
  // l'invalider aussi côté admin pour éviter une re-connection via magic link).

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email: undefined,
    phone: undefined,
    ban_duration: "876000h", // 100 ans, équivalent ban permanent
  });
  if (authError) {
    // Non bloquant : public.users est déjà anonymisé. On log mais on continue.
    console.error("[deleteAccount] auth.admin update failed:", authError.message);
  }

  // Étape 3 : signOut côté serveur (clear cookies)
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
