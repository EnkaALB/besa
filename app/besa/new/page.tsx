import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { BesaForm } from "@/components/features/besa-form";

/**
 * Calcule une échéance par défaut : J+7, à 18 h, format YYYY-MM-DDTHH:mm
 * (utilisable directement par input type=datetime-local).
 */
function defaultDeadlineValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  // YYYY-MM-DDTHH:mm — pas de Z (datetime-local est local-time, pas UTC)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function NewBesaPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/besa/new");
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-24">
      <div className="w-full max-w-xl space-y-10">
        <header className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-px w-12 bg-primary" />
          </div>
          <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
            Une nouvelle besa.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Un engagement à co-signer.
          </p>
        </header>

        <BesaForm defaultDeadline={defaultDeadlineValue()} />
      </div>
    </main>
  );
}
