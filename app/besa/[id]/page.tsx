import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CopyLink } from "@/components/features/copy-link";
import { weightLabel } from "@/lib/validators/besa";

async function getOrigin(): Promise<string> {
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

interface BesaDetailPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "En attente de signature",
  active: "Active",
  pending_validation: "À valider",
  resolved_kept: "Tenue",
  resolved_broken: "Non tenue",
  in_dispute: "En litige",
  ghosted: "Ghost",
};

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default async function BesaDetailPage({
  params,
}: BesaDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/besa/${id}`);
  }

  const { data: besa } = await supabase
    .from("besas")
    .select("id, creator_id, title, description, deadline, status, weight_final, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!besa) {
    notFound();
  }

  const isCreator = besa.creator_id === user.id;

  // Récupère les parties (créateur + cosigner si déjà signé)
  const { data: parties } = await supabase
    .from("besa_parties")
    .select("user_id, role, weight_ressenti, signed_at, validation_choice")
    .eq("besa_id", id);

  const creatorParty = parties?.find((p) => p.role === "creator");
  const cosignerParty = parties?.find((p) => p.role === "cosigner");

  // Si draft + créateur : on affiche le lien à partager
  let invite: { token: string; expires_at: string } | null = null;
  let inviteUrl: string | null = null;
  if (besa.status === "draft" && isCreator) {
    const { data: inv } = await supabase
      .from("besa_invites")
      .select("token, expires_at")
      .eq("besa_id", id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    invite = inv;
    if (invite) {
      const origin = await getOrigin();
      inviteUrl = `${origin}/b/${invite.token}`;
    }
  }

  const weightVisible = besa.status !== "draft" && besa.weight_final !== null;

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-24">
      <div className="w-full max-w-2xl space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {STATUS_LABELS[besa.status] ?? besa.status}
          </p>
          <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
            {besa.title}
          </h1>
          {besa.description ? (
            <p className="mx-auto max-w-xl text-muted-foreground leading-relaxed">
              {besa.description}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Échéance : <span className="text-foreground">{formatDeadline(besa.deadline)}</span>
          </p>
        </header>

        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>

        {/* Section share-link quand draft + créateur */}
        {besa.status === "draft" && isCreator ? (
          <section className="space-y-4">
            <h2 className="font-serif text-xl tracking-tight">Ton lien à partager</h2>
            <p className="text-sm text-muted-foreground">
              Envoie ce lien à la personne avec qui tu veux sceller cette besa. Il expire dans
              7 jours et ne peut être utilisé qu&apos;une fois.
            </p>
            {invite && inviteUrl ? (
              <>
                <CopyLink url={inviteUrl} />
                <p className="text-xs text-muted-foreground">
                  Expire le {formatDeadline(invite.expires_at)}.
                </p>
              </>
            ) : (
              <p className="text-sm text-destructive">Aucun lien actif pour cette besa.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Ton poids ressenti reste secret tant qu&apos;elle n&apos;a pas signé.
            </p>
          </section>
        ) : null}

        {/* Section poids quand active ou résolue */}
        {weightVisible ? (
          <section className="space-y-6 rounded-lg border border-border bg-secondary/30 p-6">
            <h2 className="font-serif text-xl tracking-tight">Poids ressentis</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Créateur
                </p>
                <p className="mt-2 font-serif text-4xl text-foreground tabular-nums">
                  {creatorParty?.weight_ressenti ?? "?"}
                </p>
                {creatorParty?.weight_ressenti ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {weightLabel(creatorParty.weight_ressenti)}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Co-signataire
                </p>
                <p className="mt-2 font-serif text-4xl text-foreground tabular-nums">
                  {cosignerParty?.weight_ressenti ?? "?"}
                </p>
                {cosignerParty?.weight_ressenti ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {weightLabel(cosignerParty.weight_ressenti)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="border-t border-border pt-4 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Poids final
              </p>
              <p className="mt-2 font-serif text-5xl text-primary tabular-nums">
                {besa.weight_final?.toFixed(1)}
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
