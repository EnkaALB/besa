# Besa — Architecture

> Document évolutif. Décrit la structure du projet, les conventions de code et les choix techniques arrêtés. À mettre à jour quand un choix change.

## 1. Structure de dossiers

```
besa/
├── app/                       # Routes App Router (Server Components par défaut)
│   ├── (auth)/                # Group : login, callback magic link
│   ├── (public)/              # Group : pages publiques (profils, atterrissage besa)
│   ├── (app)/                 # Group : pages authentifiées (sidebar, etc.)
│   ├── api/                   # Route handlers (webhooks, cron, export RGPD)
│   ├── layout.tsx             # Root layout (fonts, providers)
│   ├── page.tsx               # Landing publique
│   └── globals.css            # Tokens Tailwind 4 (@theme)
├── components/
│   ├── ui/                    # Primitives shadcn (Button, Input, …)
│   ├── features/              # Composants fonctionnels (BesaForm, ScoreBadge, …)
│   └── layouts/               # Page shells, headers, sidebars
├── lib/
│   ├── supabase/              # Clients serveur/browser/admin
│   ├── score/                 # Calcul du Besa Score
│   ├── tokens/                # Génération tokens d'invitation
│   ├── validators/            # Schémas Zod
│   └── utils.ts               # cn(), helpers
├── types/                     # Types TS partagés (Database, App)
├── supabase/
│   ├── migrations/            # SQL versionné
│   └── config.toml            # Projet Supabase local (à venir)
└── docs/
    ├── CLAUDE.md
    ├── ROADMAP.md
    ├── ARCHITECTURE.md        # ce fichier
    └── DECISIONS.md
```

## 2. Stack et raisons

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 16 App Router | RSC, Server Actions, brief impose 14+ |
| Langage | TypeScript strict + 3 extras | `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. `target: ES2022`. |
| Style | Tailwind 4 (CSS-first) | Tokens dans `globals.css` via `@theme`, plus de `tailwind.config.ts` |
| Composants | shadcn/ui | Headless, ownership total, customisation directe |
| Auth + DB | Supabase EU (Frankfurt) | RLS native, magic link gratuit, RGPD compliant |
| Email | Resend (free tier) | 3 000/mois suffisent pour MVP |
| Validation | Zod | Schémas partagés client/server, dérivation types |
| Form | react-hook-form + Server Actions | Client validation + revalidation server |
| Tests | Vitest + Playwright | Unit/intégration + E2E |
| CI | GitHub Actions | typecheck + lint + test sur PR |
| Hosting | Vercel | Free tier suffit, intégration Next.js |

### Pas d'ORM (pour le MVP)
On utilise le client Supabase JS directement. Pas de Drizzle/Prisma — la RLS native suffit, et un ORM ajouterait une surface inutile. Migration vers Drizzle envisageable en Sprint 4+ si la complexité augmente (voir `DECISIONS.md` #15).

## 3. Conventions

### Server vs Client Components
- **Server Components par défaut** (pas de `'use client'`).
- Client uniquement pour : interactivité, hooks React, accès `window`, état local.
- Les forms : RHF côté client + Server Action pour la soumission, double validation Zod.

### Imports
- Alias `@/*` pour tout import interne.
- Order : externe → interne → relatif.

### Naming
- **Fichiers** : kebab-case (`besa-form.tsx`, `score-badge.tsx`).
- **Composants** : PascalCase (`BesaForm`, `ScoreBadge`).
- **Variables/fonctions** : camelCase.
- **Constants** : UPPER_SNAKE_CASE.
- **Types** : PascalCase. Préférer `type` à `interface` sauf pour merging.

### Erreur et logs
- Pas de `try/catch` silencieux. Toujours logger ou propager.
- Côté server : `console.error` (Vercel logs).
- Côté client : Sonner toast + Sentry (à ajouter en Sprint 4).

### Zod
- Schémas dans `lib/validators/`, dérivés en types via `z.infer`.
- Un schéma = source unique de vérité (validation + type).

### Supabase clients
- `lib/supabase/server.ts` — client RSC (avec cookies/auth)
- `lib/supabase/browser.ts` — client client-side
- `lib/supabase/admin.ts` — `service_role` (jamais exposé client, jamais commit, lu depuis `SUPABASE_SERVICE_ROLE_KEY`)

### RLS
- **Activée sur toutes les tables dès la création.**
- Policies expressives : un user ne lit que SES besas, SES parties, SES score_events.
- Profils publics : table `users` lisible par anon, colonnes filtrées via view ou policies sur colonnes.

## 4. Auth flow (magic link)

1. User entre email → `supabase.auth.signInWithOtp({ email })`
2. Supabase envoie un email (template via Resend en production)
3. User clique le lien → redirige vers `/auth/callback?code=…`
4. Callback échange le code contre une session, set cookie HTTP-only, redirige
5. Si premier login : redirection vers `/onboarding` (pseudo, profil)
6. Sinon : redirection vers `/` ou `?next=` original

## 5. Routing (groupes App Router)

```
app/
├── (public)/                       # Pas de sidebar, accessible sans auth
│   ├── u/[username]/page.tsx       # Profil public
│   └── b/[token]/page.tsx          # Atterrissage besa (page stratégique)
├── (auth)/
│   ├── login/page.tsx
│   └── callback/page.tsx
└── (app)/                          # Layout authentifié
    ├── besa/
    │   ├── new/page.tsx
    │   └── [id]/page.tsx
    ├── settings/page.tsx
    └── onboarding/page.tsx
```

## 6. Calcul du Besa Score (V1)

Implémenté en TS dans `lib/score/calculate.ts`. Pourrait migrer en Postgres function plus tard pour la performance.

```ts
const HALF_LIFE_DAYS = 180;
const MIN_BESAS_FOR_SCORE = 5;
const GRACE_PERIOD_DAYS = 30;

type ScoreEvent = {
  delta: number;          // signed: +10×poids (kept), -10×poids (ghost), -7×poids (aveu)
  createdAt: Date;
};

function calculateScore(
  events: ScoreEvent[],
  accountCreatedAt: Date,
): { score: number; status: 'building' | 'computed' } {
  const validatedEvents = events.filter(e => {
    const ageMs = e.createdAt.getTime() - accountCreatedAt.getTime();
    return ageMs > GRACE_PERIOD_DAYS * 86_400_000;
  });

  if (validatedEvents.length < MIN_BESAS_FOR_SCORE) {
    return { score: 50, status: 'building' };
  }

  const now = Date.now();
  let weighted = 0;
  let totalWeight = 0;

  for (const event of validatedEvents) {
    const ageDays = (now - event.createdAt.getTime()) / 86_400_000;
    const decay = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    weighted += event.delta * decay;
    totalWeight += Math.abs(event.delta) * decay;
  }

  if (totalWeight === 0) {
    return { score: 50, status: 'computed' };
  }

  const normalized = 50 + (weighted / totalWeight) * 50;
  return { score: Math.max(0, Math.min(100, normalized)), status: 'computed' };
}
```

### Paliers
- 0–39 : Inconstant
- 40–59 : Fiable
- 60–74 : Solide
- 75–89 : Pilier
- 90–100 : Légende de Parole

## 7. Tokens d'invitation

`lib/tokens/invite.ts` :

```ts
import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const TOKEN_LENGTH = 12;

export function generateInviteToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return token;
}
```

12 chars base62 ≈ 71 bits d'entropie, collision improbable.

## 8. Rate limiting

Endpoints critiques (auth, création de besa, validation) protégés via :
- Vercel KV (Upstash Redis) — free tier
- Clé : IP + endpoint
- Limites :
  - Auth / OTP : 5 req/min par IP
  - Création de besa : 10 req/min par user
  - Lecture publique : 60 req/min par IP

## 9. RGPD

- **Export** : endpoint `/api/me/export` retourne JSON de toutes les données de l'user (profil, besas, parties, score_events).
- **Suppression** : endpoint `/api/me/delete` — **anonymisation** plutôt que DELETE :
  - `full_name = 'Compte supprimé'`
  - `email = null`, `phone = null`
  - `avatar_url = null`
  - Username → identifiant aléatoire opaque (`deleted_<uuid>`)
  - Les besas restent et impactent toujours le score du co-signataire
- Justification : considérant 26 RGPD (données anonymisées ne sont plus des données personnelles + intégrité des engagements pris avec d'autres).

## 10. Tests

### Unitaire (Vitest)
- `lib/score/calculate.test.ts` — cas limites, demi-vie, plafonds, période de grâce
- `lib/tokens/invite.test.ts` — entropie, format, unicité statistique
- `lib/validators/*.test.ts` — schémas Zod

### E2E (Playwright)
- `tests/e2e/signup.spec.ts`
- `tests/e2e/create-besa.spec.ts`
- `tests/e2e/sign-besa.spec.ts`
- `tests/e2e/validate-besa.spec.ts`
- `tests/e2e/ghost-besa.spec.ts`

## 11. Variables d'environnement

`.env.local` (jamais commit) :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # ou https://getbesa.app
CRON_SECRET=                                 # protège l'endpoint Vercel Cron
```

`.env.example` commit (avec valeurs vides) pour onboarding.
