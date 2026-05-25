import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/features/sign-out-button";
import { weightLabel } from "@/lib/validators/besa";

const STATUS_LABELS: Record<string, string> = {
  draft: "En attente de signature",
  active: "Active",
  pending_validation: "À valider",
  resolved_kept: "Tenue",
  resolved_broken: "Non tenue",
  in_dispute: "En litige",
  ghosted: "Ghost",
};

const STATUS_TONE: Record<string, string> = {
  draft: "text-muted-foreground",
  active: "text-foreground",
  pending_validation: "text-primary",
  resolved_kept: "text-foreground",
  resolved_broken: "text-muted-foreground",
  in_dispute: "text-primary",
  ghosted: "text-destructive",
};

export interface DashboardBesa {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  status: string;
  weight_final: number | null;
  created_at: string;
  role: "creator" | "cosigner";
}

export interface DashboardProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface HomeDashboardProps {
  profile: DashboardProfile;
  besas: DashboardBesa[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function firstName(fullName: string | null, username: string): string {
  if (!fullName) return username;
  return fullName.split(/\s+/)[0] ?? username;
}

function initials(profile: DashboardProfile): string {
  if (profile.full_name) {
    return (
      profile.full_name
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join("") || profile.username[0]?.toUpperCase() || "?"
    );
  }
  return profile.username[0]?.toUpperCase() ?? "?";
}

export function HomeDashboard({ profile, besas }: HomeDashboardProps): React.JSX.Element {
  const greeting = firstName(profile.full_name, profile.username);
  const activeOrPending = besas.filter((b) =>
    ["draft", "active", "pending_validation"].includes(b.status),
  );
  const resolved = besas.filter((b) =>
    ["resolved_kept", "resolved_broken", "in_dispute", "ghosted"].includes(b.status),
  );

  return (
    <main className="flex min-h-screen flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-12">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <Link href={`/u/${profile.username}`} className="flex items-center gap-3 group">
            <Avatar className="h-10 w-10">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.username} />
              ) : null}
              <AvatarFallback className="font-serif text-sm">{initials(profile)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium transition-colors group-hover:text-primary">
                @{profile.username}
              </p>
              <p className="text-xs text-muted-foreground">Voir mon profil</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/settings">Réglages</Link>
            </Button>
            <SignOutButton />
          </div>
        </header>

        {/* Greeting + accent */}
        <section className="space-y-6 pt-6">
          <div className="h-px w-12 bg-primary" />
          <h1 className="font-serif text-4xl font-light leading-tight tracking-tight md:text-5xl">
            Bonjour, {greeting}.
          </h1>
          <p className="text-muted-foreground">
            {besas.length === 0
              ? "Aucune besa pour l'instant. C'est le moment d'en sceller une."
              : `${besas.length} besa${besas.length > 1 ? "s" : ""} à ton actif.`}
          </p>
        </section>

        {/* Primary CTA */}
        <Button asChild className="h-14 w-full text-base" size="lg">
          <Link href="/besa/new">Sceller une nouvelle besa</Link>
        </Button>

        {/* Active or pending */}
        {activeOrPending.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-serif text-xl tracking-tight">En cours</h2>
            <div className="space-y-3">
              {activeOrPending.map((besa) => (
                <BesaListItem key={besa.id} besa={besa} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Resolved */}
        {resolved.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-serif text-xl tracking-tight">Passées</h2>
            <div className="space-y-3">
              {resolved.map((besa) => (
                <BesaListItem key={besa.id} besa={besa} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Empty state */}
        {besas.length === 0 ? (
          <section className="rounded-lg border border-border bg-secondary/30 p-8 text-center">
            <p className="font-serif text-lg">Aucune besa scellée.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Une besa est un engagement co-signé entre deux parties. Crée la première en
              cliquant le bouton ci-dessus.
            </p>
          </section>
        ) : null}

        <footer className="pt-12 text-center text-xs text-muted-foreground">
          <p>
            Besa MVP. <Link href="/" className="hover:text-foreground">À propos</Link>.
          </p>
        </footer>
      </div>
    </main>
  );
}

function BesaListItem({ besa }: { besa: DashboardBesa }): React.JSX.Element {
  return (
    <Link
      href={`/besa/${besa.id}`}
      className="group block rounded-lg border border-border bg-background p-5 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p
            className={`text-xs uppercase tracking-widest ${STATUS_TONE[besa.status] ?? "text-muted-foreground"}`}
          >
            {STATUS_LABELS[besa.status] ?? besa.status}
            {besa.role === "cosigner" ? " · signée" : ""}
          </p>
          <p className="truncate font-serif text-lg transition-colors group-hover:text-primary">
            {besa.title}
          </p>
          {besa.description ? (
            <p className="line-clamp-1 text-sm text-muted-foreground">{besa.description}</p>
          ) : null}
        </div>
        {besa.weight_final !== null ? (
          <div className="shrink-0 text-right">
            <p className="font-serif text-2xl tabular-nums">{besa.weight_final.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{weightLabel(besa.weight_final)}</p>
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Échéance · {formatDate(besa.deadline)}
      </p>
    </Link>
  );
}
