import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Export RGPD : retourne en JSON l'ensemble des données associées à l'utilisateur
 * authentifié (profil, besas créées, besa_parties signées, score_events).
 *
 * Téléchargement déclenché côté client via <a href="/api/me/export" download>.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const [profileRes, besasRes, partiesRes, scoreEventsRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("besas").select("*").eq("creator_id", user.id),
    supabase.from("besa_parties").select("*").eq("user_id", user.id),
    supabase.from("score_events").select("*").eq("user_id", user.id),
  ]);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    notice:
      "Export RGPD complet. Contient toutes les données personnelles et liées à ton compte Besa.",
    auth_user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
    },
    profile: profileRes.data,
    besas_created: besasRes.data ?? [],
    besa_parties_signed: partiesRes.data ?? [],
    score_events: scoreEventsRes.data ?? [],
  };

  const filename = `besa-export-${user.id.slice(0, 8)}-${Date.now()}.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
