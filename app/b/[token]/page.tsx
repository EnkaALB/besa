import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTokenFormat } from "@/lib/tokens/invite";
import { BesaSigningCard } from "@/components/features/besa-signing-card";
import { InviteInvalidView } from "@/components/features/invite-invalid-view";

interface InviteLandingProps {
  params: Promise<{ token: string }>;
}

/**
 * Page d'atterrissage d'une invitation (la plus stratégique du produit).
 *
 * - Le token est PUBLIC (qui l'a peut signer). Le proxy.ts laisse passer /b/*.
 * - Pour lire la besa et le profil du créateur sans avoir la session du créateur,
 *   on utilise l'admin client (le token EST l'authentification, niveau MVP).
 * - Si le visiteur n'est pas authentifié, on redirige vers /login?next=/b/{token}.
 * - Le poids ressenti du créateur n'est JAMAIS exposé tant que le cosigner n'a pas signé.
 */
export default async function InviteLandingPage({
  params,
}: InviteLandingProps): Promise<React.JSX.Element> {
  const { token } = await params;

  if (!isValidTokenFormat(token)) {
    return <InviteInvalidView reason="not_found" />;
  }

  const admin = createAdminClient();

  // 1. Récupère l'invite (admin pour bypass RLS — le token = secret)
  const { data: invite } = await admin
    .from("besa_invites")
    .select("token, besa_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return <InviteInvalidView reason="not_found" />;
  }

  if (invite.used_at) {
    return <InviteInvalidView reason="used" />;
  }

  // Date.now() est techniquement "impur" (la règle react-hooks/purity le flag),
  // mais ici c'est légitime : on compare l'expiration du token au temps actuel
  // de la requête. Un Server Component re-rend à chaque requête, donc le résultat
  // diffère naturellement et c'est voulu.
  // eslint-disable-next-line react-hooks/purity
  const isExpired = new Date(invite.expires_at).getTime() < Date.now();
  if (isExpired) {
    return <InviteInvalidView reason="expired" />;
  }

  // 2. Récupère la besa
  const { data: besa } = await admin
    .from("besas")
    .select("id, creator_id, title, description, deadline, status")
    .eq("id", invite.besa_id)
    .maybeSingle();

  if (!besa) {
    return <InviteInvalidView reason="not_found" />;
  }

  if (besa.status !== "draft") {
    return <InviteInvalidView reason="already_active" />;
  }

  // 3. Récupère le profil créateur (publiquement lisible via RLS, mais admin pour homogénéité)
  const { data: creator } = await admin
    .from("users")
    .select("username, full_name, avatar_url")
    .eq("id", besa.creator_id)
    .maybeSingle();

  // 4. Vérifie l'authentification du visiteur
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/b/${token}`);
  }

  if (user.id === besa.creator_id) {
    return <InviteInvalidView reason="self" />;
  }

  return (
    <BesaSigningCard
      token={token}
      besa={{
        id: besa.id,
        title: besa.title,
        description: besa.description,
        deadline: besa.deadline,
      }}
      creator={{
        username: creator?.username ?? null,
        full_name: creator?.full_name ?? null,
        avatar_url: creator?.avatar_url ?? null,
      }}
    />
  );
}
