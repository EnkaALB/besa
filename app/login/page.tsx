import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm space-y-10 text-center">
        <div className="flex justify-center">
          <div className="h-px w-12 bg-primary" />
        </div>
        <h1 className="font-serif text-3xl font-light tracking-tight md:text-4xl">
          Te connecter.
        </h1>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    </main>
  );
}
