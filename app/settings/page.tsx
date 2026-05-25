import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/features/settings-form";
import { DeleteAccountButton } from "@/components/features/delete-account-button";
import { SignOutButton } from "@/components/features/sign-out-button";
import { Button } from "@/components/ui/button";

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username, full_name, bio, avatar_url, score_visible_public")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.username) {
    redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-24">
      <div className="w-full max-w-xl space-y-12">
        <header className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
            Réglages.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Connecté en tant que {user.email}</p>
        </header>

        <SettingsForm
          userId={user.id}
          email={user.email ?? ""}
          initial={{
            username: profile.username,
            full_name: profile.full_name ?? "",
            bio: profile.bio ?? "",
            avatar_url: profile.avatar_url,
            score_visible_public: profile.score_visible_public,
          }}
        />

        <section className="space-y-4 border-t border-border pt-10">
          <h2 className="font-serif text-xl tracking-tight">Tes données</h2>
          <p className="text-sm text-muted-foreground">
            Tu peux exporter une copie de tes données à tout moment, ou supprimer ton compte
            définitivement.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <a href="/api/me/export" download>
                Exporter mes données (JSON)
              </a>
            </Button>
            <DeleteAccountButton />
          </div>
        </section>

        <section className="border-t border-border pt-10 text-center">
          <SignOutButton />
        </section>
      </div>
    </main>
  );
}
