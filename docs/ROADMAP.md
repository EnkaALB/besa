# Besa — Roadmap

> Plan en sprints d'1 semaine. Un **GO explicite** est requis entre chaque sprint et à chaque gate intra-sprint signalé ⛔.

---

## Sprint 0 — Fondations

**Démarré** : 2026-05-24
**Statut** : en cours

**Objectif** : projet Next.js propre, design system appliqué, docs en place, schéma DB validé, infrastructure prête.

### 0.1 — Scaffolding local
- [x] `npx create-next-app` (Next 16.2, TS strict, Tailwind 4, App Router, no src)
- [x] tsconfig durci (`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, target ES2022)
- [x] Structure `/app /components/{ui,features,layouts} /lib /types /supabase/{migrations} /docs`
- [x] shadcn/ui setup manuel (CLI 3.x trop interactif) : `components.json`, `lib/utils.ts`, composants Button/Input/Card/Badge/Avatar (Dialog + Toast reportés à Sprint 1+)
- [x] Tokens Tailwind 4 dans `globals.css` (couleurs Besa en OKLCH, fonts Fraunces + Inter)
- [x] Layout root chargeant Fraunces + Inter via `next/font/google`
- [x] Page d'accueil sobre appliquant le design system
- [x] Typecheck `tsc --noEmit` vert

### 0.2 — Docs pérennes
- [x] `docs/CLAUDE.md` (synthèse du brief)
- [x] `docs/ROADMAP.md` (ce fichier)
- [x] `docs/ARCHITECTURE.md` (structure, conventions, choix)
- [x] `docs/DECISIONS.md` (log ADR)

### 0.3 — Schéma DB ⛔ GATE
- [x] Schéma SQL proposé dans `supabase/SCHEMA_PROPOSAL.sql` (5 tables + RLS + RPC consume_invite + triggers)
- [ ] **STOP — attente GO explicite avant d'écrire la migration**
- [ ] Renommer vers `supabase/migrations/0001_initial.sql` après validation

### 0.4 — Cloud setup (après GO du schéma)
- [ ] Projet Supabase EU (Frankfurt) — création + clés env
- [ ] Migration initiale appliquée
- [ ] Repo GitHub privé `besa` (via `gh`)
- [ ] Projet Vercel lié, déploiement preview
- [ ] CI GitHub Actions : typecheck + lint + test

### 0.5 — Livrable Sprint 0
- URL Vercel preview avec page d'accueil dans le design system
- Repo GitHub avec les 4 docs à jour
- Supabase prêt avec le schéma validé
- CI verte sur `main`

**⛔ GO requis avant Sprint 1.**

---

## Sprint 1 — Auth + Profil minimal

**Objectif** : un user peut s'inscrire, se connecter, créer et consulter son profil public.

- Magic link email (Supabase Auth) — flow complet, redirection après auth
- Onboarding : pseudo (avec dispo check temps réel), prénom, nom, photo optionnelle (Supabase Storage), bio
- Page `/u/{username}` — état "En construction" (pas encore de score)
- Settings : changement de pseudo, export RGPD (JSON), suppression de compte (anonymisation)
- Rate limiting sur endpoints auth (Vercel KV / Upstash gratuit)
- Tests Vitest : validation Zod du profil, génération username

**Livrable** : `/login`, `/onboarding`, `/u/{username}`, `/settings` fonctionnels.

**⛔ GO avant Sprint 2.**

---

## Sprint 2 — Création de besa + lien d'invitation

**Objectif** : flux complet « Je crée une besa → j'invite quelqu'un → il signe → la besa est active ».

- Formulaire de création `/besa/new` — titre, description, deadline (DatePicker), poids 1-10 avec micro-copy
- Génération token base62 12 chars (`crypto.randomBytes`)
- Stockage `besa_invites`, expiration 7j, usage unique
- Page d'atterrissage `/b/{token}` — **la page la plus stratégique du produit**
  - Affichage créateur (nom, photo, score s'il existe)
  - Titre, description, échéance
  - **Poids du créateur masqué** jusqu'à signature
  - Un seul gros bouton "Donner ma besa"
- Auth conditionnel (magic link si nouveau) puis signature
- Pose du poids en aveugle (curseur 1-10)
- Animation de révélation des deux poids, calcul de la moyenne
- Transition vers `active`, notification email aux deux parties
- Tests Vitest : expiration des tokens, unicité d'usage, transitions d'état

**Livrable** : flux end-to-end signature → besa active.

**⛔ GO avant Sprint 3.**

---

## Sprint 3 — Échéance + Score V1

**Objectif** : un user peut clôturer une besa et voir son score évoluer.

- Cron Vercel quotidien (00:00 UTC) — passe les besas en `pending_validation`, envoie email J-2 et J+0
- UI `/besa/{id}/validate` — boutons Tenue / Non tenue / Contestée
- Logique de résolution selon les 4 combinaisons (tenue/tenue, broken/broken, désaccord, ghost)
- Détection ghoster : pas de réponse 15j → status `ghosted`, pénalité forte
- Calcul du score (TS dans `lib/score/`) avec :
  - Pondération temporelle exponentielle (demi-vie 180j)
  - Reconnaissance honnête -30% vs ghost
  - Plafond 3 besas/jour entre 2 mêmes users
  - Détection comptes liés (log seulement, pénalité au-delà du seuil)
- Table `score_events` pour audit complet
- Page `/u/{username}` enrichie : score, niveau, badge, chronologie des besas publiques
- Toggle public/privé sur chaque besa
- Pas de score affiché si `< 5` besas validées ("En construction")
- Période de grâce 30j sur les nouveaux comptes
- Tests Vitest : calcul de score (cas limites, demi-vie, ghosters, plafonds)

**Livrable** : workflow d'échéance complet, score affiché et mis à jour.

**⛔ GO avant Sprint 4.**

---

## Sprint 4 — Robustesse + go/no-go MVP

**Objectif** : MVP production-ready, déployable sur `getbesa.app`.

- Couverture Vitest sur transitions d'état, détection comptes liés, calcul score
- Tests Playwright sur 4 parcours critiques :
  - Inscription → onboarding → profil
  - Création de besa → signature → activation
  - Échéance → validation → score
  - Ghost (15j sans réponse)
- Bug bash interne
- Polish UX : transitions, états vides, états d'erreur, micro-copy final
- Welcome flow (onboarding doux)
- Accessibilité : nav clavier, ARIA, contraste WCAG AA
- `DECISIONS.md` complété, `ROADMAP.md` actualisée pour phases suivantes
- Achat domaine `getbesa.app`, DNS sur Vercel
- Recherche antériorité marque "Besa" finalisée
- Lancement preview privé pour beta-testeurs (10-20 personnes)

**Livrable** : MVP en ligne sur `getbesa.app`, prêt pour beta privée.

**⛔ GO avant Phase 2.**

---

## Phases ultérieures (hors-scope MVP, vision)

- **Phase 2** : OTP SMS, premium payant, classements, comparaisons sociales, push web.
- **Phase 3** : Comptes Entité (organisations), Stripe, intégrations B2B.
- **Phase 4** : Paroles publiques sans destinataire, médiation par jury de pairs, témoins.
