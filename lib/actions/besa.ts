"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createBesaSchema, type CreateBesaInput } from "@/lib/validators/besa";
import { generateInviteToken } from "@/lib/tokens/invite";

export type CreateBesaResult =
  | { ok: true; besaId: string; token: string }
  | { ok: false; error: string };

const MAX_TOKEN_RETRIES = 3;

/**
 * Crée une besa (status = 'draft'), ajoute le créateur dans besa_parties,
 * et génère un token d'invitation à partager.
 *
 * Si tout réussit, redirige vers /besa/{id} (où le créateur voit son lien à partager).
 * En cas d'erreur, retourne { ok: false, error } pour affichage en toast côté form.
 *
 * Note : on fait 3 opérations (besas / besa_parties / besa_invites) sans transaction
 * explicite côté client Supabase. En cas d'échec en cours de route, on tente un rollback
 * manuel (DELETE besas, qui cascade sur besa_parties). Pas parfait mais acceptable pour MVP.
 * À migrer vers une RPC `create_besa()` SECURITY DEFINER si on observe des incohérences.
 */
export async function createBesa(input: CreateBesaInput): Promise<CreateBesaResult> {
  const parsed = createBesaSchema.safeParse(input);
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

  // 1. INSERT besa (draft)
  const { data: besa, error: besaErr } = await supabase
    .from("besas")
    .insert({
      creator_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      deadline: parsed.data.deadline,
      status: "draft",
    })
    .select("id")
    .single();

  if (besaErr || !besa) {
    return { ok: false, error: besaErr?.message ?? "Création de la besa impossible" };
  }

  // 2. INSERT besa_party (creator + son poids)
  const { error: partyErr } = await supabase.from("besa_parties").insert({
    besa_id: besa.id,
    user_id: user.id,
    role: "creator",
    weight_ressenti: parsed.data.weight_ressenti,
    signed_at: new Date().toISOString(),
  });

  if (partyErr) {
    await supabase.from("besas").delete().eq("id", besa.id);
    return { ok: false, error: `Erreur creator party : ${partyErr.message}` };
  }

  // 3. Génère un token unique + INSERT besa_invites
  let token: string | null = null;
  let lastErr: string | null = null;

  for (let attempt = 0; attempt < MAX_TOKEN_RETRIES && !token; attempt++) {
    const candidate = generateInviteToken();
    const { error: inviteErr } = await supabase
      .from("besa_invites")
      .insert({ token: candidate, besa_id: besa.id });

    if (!inviteErr) {
      token = candidate;
      break;
    }

    lastErr = inviteErr.message;
    // Collision (super improbable mais on retry) — sinon abort.
    if (!inviteErr.message.toLowerCase().includes("duplicate")) {
      break;
    }
  }

  if (!token) {
    await supabase.from("besas").delete().eq("id", besa.id);
    return {
      ok: false,
      error: `Génération du token impossible : ${lastErr ?? "inconnue"}`,
    };
  }

  revalidatePath("/", "layout");
  redirect(`/besa/${besa.id}`);
}
