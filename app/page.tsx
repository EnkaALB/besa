import { createClient } from "@/lib/supabase/server";
import {
  HomeDashboard,
  type DashboardBesa,
  type DashboardProfile,
} from "@/components/features/home-dashboard";
import { PublicLanding } from "@/components/features/public-landing";

export default async function HomePage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visiteur anonyme → landing publique
  if (!user) {
    return <PublicLanding />;
  }

  // Récupère le profil
  const { data: profile } = await supabase
    .from("users")
    .select("username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Le proxy redirige déjà /onboarding si username NULL, mais on guard quand même.
  if (!profile?.username) {
    return <PublicLanding />;
  }

  // Récupère toutes les besas où l'user est créateur OU partie
  // Deux requêtes en parallèle puis on dédoublonne par ID.
  const [createdRes, signedRes] = await Promise.all([
    supabase
      .from("besas")
      .select("id, title, description, deadline, status, weight_final, created_at")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("besa_parties")
      .select(
        `role, besas:besas!besa_id(id, title, description, deadline, status, weight_final, created_at)`,
      )
      .eq("user_id", user.id)
      .neq("role", "creator")
      .limit(50),
  ]);

  const byId = new Map<string, DashboardBesa>();
  for (const b of createdRes.data ?? []) {
    byId.set(b.id, {
      id: b.id,
      title: b.title,
      description: b.description,
      deadline: b.deadline,
      status: b.status,
      weight_final: b.weight_final !== null ? Number(b.weight_final) : null,
      created_at: b.created_at,
      role: "creator",
    });
  }
  for (const row of signedRes.data ?? []) {
    const b = Array.isArray(row.besas) ? row.besas[0] : row.besas;
    if (!b) continue;
    byId.set(b.id, {
      id: b.id,
      title: b.title,
      description: b.description,
      deadline: b.deadline,
      status: b.status,
      weight_final: b.weight_final !== null ? Number(b.weight_final) : null,
      created_at: b.created_at,
      role: "cosigner",
    });
  }

  const besas: DashboardBesa[] = Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const dashboardProfile: DashboardProfile = {
    username: profile.username,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
  };

  return <HomeDashboard profile={dashboardProfile} besas={besas} />;
}
