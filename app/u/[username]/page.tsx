import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({
  params,
}: ProfilePageProps): Promise<React.JSX.Element> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("username, full_name, bio, avatar_url, account_status, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const isAnonymized = profile.account_status === "anonymized";
  const displayName = profile.full_name ?? "Sans nom";
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "?";

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-24">
      <div className="w-full max-w-xl space-y-10">
        {/* Header */}
        <div className="flex flex-col items-center gap-6 text-center">
          <Avatar className="h-28 w-28">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="font-serif text-3xl">{initials}</AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-light tracking-tight">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>

          {profile.bio && !isAnonymized ? (
            <p className="max-w-md text-base text-muted-foreground leading-relaxed">
              {profile.bio}
            </p>
          ) : null}
        </div>

        {/* Liseré accent */}
        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>

        {/* Score zone (En construction) */}
        <section className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Besa Score
          </p>
          <div className="mt-4 flex justify-center">
            <span className="inline-block rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground">
              En construction
            </span>
          </div>
          <p className="mx-auto mt-3 max-w-sm text-xs text-muted-foreground">
            Le score apparaîtra après 5 besas validées.
          </p>
        </section>

        {/* Chronologie (à venir) */}
        <section className="space-y-4 border-t border-border pt-10">
          <h2 className="font-serif text-xl tracking-tight">Besas publiques</h2>
          <p className="text-sm text-muted-foreground">Aucune besa publique pour le moment.</p>
        </section>
      </div>
    </main>
  );
}
