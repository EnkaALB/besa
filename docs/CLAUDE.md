# Besa — Brief pérenne

> Document à consulter en début de chaque session. Synthèse définitive de la vision, du périmètre, des contraintes et de la méthode de travail. Si quelque chose ici contredit ce que tu fais, arrête-toi et demande.

## 1. Vision

Besa est une application qui permet à deux parties — particuliers ou entités — de **sceller, suivre et valider des engagements pris l'un envers l'autre**. Une "besa" est un engagement co-signé, avec un contenu, une échéance, et un poids ressenti par chacun des deux signataires.

Chaque besa tenue (ou non tenue, ou contestée) impacte le **Besa Score** public de chaque partie. Le Besa Score est l'actif central du produit : il mesure la fiabilité humaine ou institutionnelle, devient portable, visible, et constitue à terme une nouvelle forme de capital social.

Le nom vient de la **besa albanaise** — la parole donnée sacrée dans les montagnes du Nord.

## 2. Ton et identité

- **Sobre, profond, adulte, jamais kitsch, jamais moralisateur.**
- Aucune gamification puérile. Aucun emoji superflu dans l'UI.
- Références esthétiques : Linear, Notion, Stripe, Things 3, Le Monde.
- **Pas** : Duolingo, Snapchat, Strava (trop sportif).

### Design system

- Couleurs :
  - `#0A0A0A` noir
  - `#FAFAF7` blanc cassé
  - `#8B0000` accent rouge profond — porte la gravité de la parole donnée, racine albanaise
- Typo :
  - **Fraunces** (serif variable) pour les titres
  - **Inter** (sans) pour le corps
- Espacement généreux. Animations subtiles, jamais flashy.
- **Mobile-first absolu.**

## 3. MVP — Phase 1 (le seul périmètre actuel)

### A. Authentification

- **Magic link email** via Supabase Auth (gratuit, illimité).
- OTP SMS **reporté en phase 2** (coût Twilio incompatible avec contrainte free-tier MVP).
- Profil utilisateur : pseudo (choisi par l'user, URL `/u/{pseudo}`), prénom, nom, photo optionnelle, bio courte.

### B. Création d'une besa (particulier à particulier)

- Champs : titre, description, date d'échéance, poids ressenti du créateur (curseur 1-10 + micro-copy "À quel point cet engagement compte pour toi ?" + ancres "Anodin"/"Sacré").
- Génération d'un lien d'invitation : `getbesa.app/b/{token}` où `token` = 12 caractères base62, `crypto.randomBytes`, non-devinable, usage unique, expire après 7 jours.
- La besa reste en `draft` jusqu'à signature du second.

### C. Page d'atterrissage `/b/{token}` (la plus stratégique du produit)

- Affiche : créateur (nom, photo, score si existant ≥ 5 besas validées), contenu de la besa, échéance.
- **Poids du créateur masqué jusqu'à signature du second.**
- Un seul gros bouton : « Donner ma besa ».
- Si user non inscrit : onboarding minimal (magic link) puis signature.
- Si user inscrit : signature directe.
- Le second signataire place SON poids ressenti **en aveugle** (sans voir celui du créateur).
- Révélation des deux poids, calcul de la moyenne, validation.
- À ce moment seulement, la besa devient `active`.

### D. Workflow d'échéance

- **Cron quotidien Vercel à 00:00 UTC** passe les besas dont `deadline < now()` en `pending_validation` et notifie les deux parties (email).
- Chacun choisit : **Tenue / Non tenue / Contestée**.
- Combinaisons :
  - Tenue + Tenue → `resolved_kept`
  - Non tenue + Non tenue → `resolved_broken` (mais reconnaissance honnête pénalise -30% vs ghost)
  - Désaccord → `in_dispute` (aucun score impacté tant que le système de médiation n'existe pas — phase 4)
  - Pas de réponse 15j d'un côté → `ghosted` côté ghoster, neutre côté patient
- Tous les utilisateurs sont relancés par email à J-2 et J+0.

### E. Profil public et Besa Score

- Page `/u/{pseudo}` consultable par tous.
- Affiche : score global sur 100, niveau nommé, nombre de besas tenues, taux de tenue, chronologie des besas publiques.
- **Privé par défaut** : l'user choisit besa par besa ce qu'il rend public.
- **Pas de score affiché en dessous de 5 besas validées** ("En construction").
- Période de grâce de **30 jours** sur les nouveaux comptes (événements ignorés dans le calcul).

### F. Calcul du Besa Score V1

- Pondération par le poids final de chaque besa (moyenne créateur/cosignataire).
- Pondération temporelle exponentielle : **demi-vie 180 jours** (`decay = 0.5 ** (ageDays / 180)`).
- Barème :
  - Tenue : `delta = +10 × poids_final`
  - Ghost : `delta = −10 × poids_final`
  - Aveu honnête (Non tenue mutuelle) : `delta = −7 × poids_final` (-30% vs ghost)
  - Litige : `delta = 0`
- **Plafond anti-abus** : maximum 3 besas/jour entre les deux mêmes utilisateurs (les suivantes ne comptent pas).
- **Détection comptes liés** : téléphone racine partagé OU (même IP + signature mutuelle dans 24h). Logger d'abord ; pénaliser (poids ÷ 5) au-delà d'un seuil ajustable.
- **Paliers** : 0–39 Inconstant, 40–59 Fiable, 60–74 Solide, 75–89 Pilier, 90–100 Légende de Parole.

### Hors-scope MVP (NE PAS CODER)

- Comptes Entité → phase 3
- Paroles publiques sans destinataire → phase 4
- Médiation par jury de pairs → phase 4
- Témoins → phase 4
- Premium payant → phase 2
- Classements / comparaisons sociales → phase 2
- Stripe → phase 3
- OTP SMS → phase 2

## 4. Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 16 App Router | RSC, Server Actions, brief impose 14+ |
| Langage | TypeScript strict + extras | Robustesse production |
| Style | Tailwind 4 CSS-first | Tokens dans `globals.css` via `@theme` |
| Composants | shadcn/ui | Headless, ownership total |
| Auth + DB | Supabase EU (Frankfurt) | RLS native, magic link, RGPD |
| Email | Resend free tier | 3 000/mois suffit MVP |
| Validation | Zod | Schémas partagés client/server |
| Tests | Vitest + Playwright | Unit/intégration + E2E |
| Hosting | Vercel free tier | Intégration Next.js native |

## 5. Structure de dossiers

```
/app          → routes App Router (Server Components par défaut)
/components
  /ui         → primitives shadcn (Button, Input, …)
  /features   → composants fonctionnels (BesaForm, ScoreBadge, …)
  /layouts    → headers, sidebars, page shells
/lib          → logique métier, clients Supabase, helpers, score calc
/types        → types TS partagés
/supabase
  /migrations → SQL versionné
  config.toml → projet Supabase local (à venir)
/docs         → CLAUDE.md (ce fichier), ROADMAP.md, ARCHITECTURE.md, DECISIONS.md
```

## 6. Principes non-négociables

### Design
- Mobile-first absolu.
- Pas d'emoji dans l'UI (sauf demande explicite de l'user).
- Espacement généreux, jamais densité dashboard.

### Code
- **Server Components par défaut.** Client uniquement si nécessaire (interactivité, hooks).
- Pas de `any` sans justification commentée.
- **RLS activée** sur toutes les tables Supabase dès la création.
- **Validation Zod** sur chaque entrée utilisateur (formulaires + API).
- Gestion d'erreur explicite, jamais de `try/catch` silencieux.
- Pas de commentaires inutiles. Noms de variables explicites.
- Tests Vitest sur la logique critique : score, signature, expiration des liens.

### Sécurité
- Tokens : `crypto.randomBytes`, jamais `Math.random`.
- Rate limiting sur endpoints sensibles dès le départ.
- Pas de données sensibles dans les URLs.
- RGPD : export + suppression de compte codés dès MVP (anonymisation, considérant 26).

## 7. Méthode de travail

1. **Sprints d'1 semaine** avec livrable concret.
2. **GO explicite obligatoire entre chaque sprint.** Et à chaque gate intra-sprint (schéma DB, choix techniques non triviaux).
3. À chaque sprint : mini-plan détaillé d'abord, validation, puis code.
4. **Pas d'implémentation unilatérale d'idées produit** — proposer dans `DECISIONS.md`.
5. Choix techniques non triviaux : lister 2-3 options avec arguments avant de trancher.
6. `ROADMAP.md` mis à jour en fin de chaque sprint.
7. Ne JAMAIS toucher aux features hors-scope sans demander.

## 8. Domaine, marque, légal

- Domaine : **`getbesa.app`** à acheter (`besa.app` indisponible).
- Marque "Besa" : recherche d'antériorité à programmer avant lancement public.
- RGPD : hébergement Supabase EU/Frankfurt obligatoire. Export + suppression dans le MVP.

## 9. Schéma DB (vue d'ensemble)

Détail dans les migrations `supabase/migrations/`. Vue d'ensemble :

- `users` — id, email, username (unique), full_name, avatar_url, bio, created_at, score_visible_public.
- `besas` — id, creator_id, title, description, deadline, status, weight_final, created_at, resolved_at.
- `besa_parties` — besa_id, user_id, role, weight_ressenti, signed_at, validation_choice, validated_at.
- `besa_invites` — token, besa_id, created_at, expires_at, used_at, used_by_user_id.
- `score_events` — id, user_id, besa_id, delta, reason, created_at (audit).

Statuts besa : `draft | active | pending_validation | resolved_kept | resolved_broken | in_dispute | ghosted`.
Validation_choice : `pending | kept | broken | contested`.

## 10. Pointeurs

- `ROADMAP.md` — plan d'exécution en 5 sprints, état d'avancement.
- `ARCHITECTURE.md` — conventions de code détaillées, calcul score, auth flow.
- `DECISIONS.md` — log ADR des choix arrêtés (avec date et raison).
