# Besa

> Une besa est un engagement co-signé entre deux parties. Quelque chose qu'on tient.
> Une trace, dans le temps, de ce qu'on a su faire.

Application qui permet à deux parties de **sceller, suivre et valider** des engagements pris l'un envers l'autre. Chaque besa tenue (ou non tenue, ou contestée) impacte le **Besa Score** public — une nouvelle forme de capital social.

## Documentation

- [`docs/CLAUDE.md`](docs/CLAUDE.md) — Brief pérenne (vision, MVP, stack, principes)
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Plan en 5 sprints
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Structure, conventions, calcul score
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Log ADR des décisions arrêtées

## Stack

Next.js 16 App Router · TypeScript strict · Tailwind 4 · shadcn/ui (Radix) · Supabase EU · Resend · Zod · Vitest + Playwright · Vercel

## Démarrage local

```bash
cp .env.example .env.local
# Remplir les variables (Supabase, Resend)
npm install
npm run dev
```

## Scripts

| Commande | Action |
|---|---|
| `npm run dev` | Serveur de dev (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Serve le build |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run lint` | ESLint |

## Schéma DB

Migration initiale : [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql) — 5 tables (`users`, `besas`, `besa_parties`, `besa_invites`, `score_events`), RLS activée partout, RPC `consume_invite()` atomique, triggers d'auto-création de profil.
