"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, usernameSchema, type OnboardingInput } from "@/lib/validators/profile";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Server Action appelée par le formulaire d'onboarding (debounced) pour vérifier
 * la disponibilité d'un username avant submit.
 */
export async function checkUsernameAvailable(rawUsername: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  const result = usernameSchema.safeParse(rawUsername);
  if (!result.success) {
    return { available: false, reason: result.error.issues[0]?.message ?? "Format invalide" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("username", result.data)
    .maybeSingle();

  if (error) {
    return { available: false, reason: "Erreur de vérification" };
  }

  return { available: data === null };
}

/**
 * Server Action de soumission de l'onboarding.
 * Valide, vérifie l'unicité, UPDATE users, et redirige vers `/`.
 */
export async function submitOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
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

  // Re-check unicité côté serveur (anti race-condition / soumission directe)
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return { ok: false, error: "Ce pseudo a été pris à l'instant. Choisis-en un autre." };
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      username: parsed.data.username,
      full_name: parsed.data.full_name,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatar_url,
    })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
