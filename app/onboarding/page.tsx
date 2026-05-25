import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/features/onboarding-form";
import { suggestUsername } from "@/lib/validators/profile";

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username, full_name, bio, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  // Déjà onboardé → home
  if (profile?.username) {
    redirect("/");
  }

  const email = user.email ?? profile?.email ?? "";
  const emailLocalPart = email.split("@")[0] ?? "";
  const suggestedUsername = emailLocalPart ? suggestUsername(emailLocalPart) : "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-10">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
            Ton profil.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Quelques informations pour commencer. Tu pourras les modifier après.
          </p>
        </div>

        <OnboardingForm
          userId={user.id}
          email={email}
          initialUsername={suggestedUsername}
        />
      </div>
    </main>
  );
}
