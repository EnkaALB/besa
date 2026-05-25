# Besa — Décisions

> Log chronologique des décisions techniques et produit. Format inspiré ADR (Architecture Decision Records). À enrichir au fil du projet.

---

## 2026-05-24 — Sprint 0 (init)

### #1 — Domaine `getbesa.app` (et non `besa.app` ou `besa.io`)
- **Statut** : adopté
- **Contexte** : `besa.app` indisponible. Alternatives proposées : `besa.io`, `besa.co`, `besa.xyz`, `besa.fr`, `getbesa.com`, `usebesa.com`, `joinbesa.com`, `besaapp.com`.
- **Décision** : `getbesa.app` (combine pattern "get" startup avec TLD `.app` initial souhaité).
- **Conséquence** : achat à programmer ; recherche d'antériorité marque "Besa" en parallèle.

### #2 — Auth MVP = magic link email seul (pas d'OTP SMS)
- **Statut** : adopté
- **Contexte** : Le brief initial prévoyait OTP SMS comme principal. SMS = payant (Twilio, Supabase phone). Contrainte utilisateur : MVP gratuit.
- **Décision** : magic link email seul via Supabase Auth (gratuit, illimité). OTP SMS reporté en phase 2.
- **Conséquence** : risque produit assumé — un email est une identité plus faible qu'un téléphone (anti-faux comptes plus difficile). Compensé via détection comptes liés et seuil 5 besas pour score affiché.

### #3 — Notifications MVP = email uniquement (Resend free tier)
- **Statut** : adopté
- **Contexte** : SMS payant, push web complexe (PWA). Resend free tier = 3 000/mois.
- **Décision** : email Resend pour tous les événements critiques (signature reçue, échéance J-2/J/J+7, litige, ghost).
- **Conséquence** : pas de notif temps réel, dépendance à l'inbox utilisateur. Push web envisagé en phase 2.

### #4 — Accent colorimétrique `#8B0000`
- **Statut** : adopté
- **Options évaluées** :
  - `#8B0000` rouge profond — **choisi**
  - `#B8860B` doré sobre — tire vers "luxe", contredit le ton adulte-sobre
  - `#5C1A1A` rouge-noir désaturé — encore plus austère, possible évolution
- **Décision** : `#8B0000`. Porte la gravité (serment, lien, sang), cohérent avec la racine albanaise, se distingue de Stripe / Linear (violet / bleu).

### #5 — Typo serif = Fraunces (et Inter pour le corps)
- **Statut** : adopté
- **Options évaluées** :
  - **Fraunces** — variable, expressive, gratuite, lisible mobile — **choisi**
  - Newsreader — plus presse Le Monde, plus neutre — alternative valide si on veut moins de personnalité
  - GT Sectra — payante, plus haut de gamme — écartée pour MVP (coût)
- **Décision** : Fraunces (titres) + Inter (corps), via `next/font/google`.

### #6 — Token d'invitation = 12 chars base62
- **Statut** : adopté
- **Contexte** : brief mentionne "token8". Discussion sur entropie.
- **Options évaluées** :
  - 8 chars alphanum (~47 bits) — collision possible à grande échelle
  - 8 bytes base32 (40 bits) — pareil, plus long
  - **12 chars base62 (~71 bits)** — **choisi**, court mais sûr
- **Décision** : 12 chars base62 via `crypto.randomBytes`. Expiration 7 jours, usage unique.

### #7 — Username choisi par l'user (pas auto-généré)
- **Statut** : adopté
- **Contexte** : Le pseudo est l'URL publique `/u/{pseudo}`. Il doit appartenir à l'user.
- **Décision** : champ choisi lors de l'onboarding, avec suggestion auto (`prenom.nom`), check de dispo en temps réel.

### #8 — Poids ressenti = curseur 1-10 + micro-copy explicative
- **Statut** : adopté
- **Décision** : sous le curseur, texte "À quel point cet engagement compte pour toi ?" + ancres visuelles "Anodin" (1) / "Sacré" (10).

### #9 — Paliers du score nommés
- **Statut** : adopté
- 0–39 : Inconstant
- 40–59 : Fiable
- 60–74 : Solide
- 75–89 : Pilier
- 90–100 : Légende de Parole

### #10 — Déclenchement de l'échéance = cron Vercel quotidien
- **Statut** : adopté
- **Décision** : Vercel Cron à 00:00 UTC. Passe les besas en `pending_validation`, envoie email J-2 et J+0 aux deux parties.

### #11 — Anonymisation à la suppression de compte (pas DELETE)
- **Statut** : adopté
- **Décision** : sur demande de suppression, anonymiser (`full_name = 'Compte supprimé'`, email/phone = NULL, avatar removed, username → `deleted_<uuid>`). Les besas restent et impactent toujours le score du co-signataire.
- **Justification** : RGPD considérant 26 (données anonymisées ne sont plus des données personnelles) + intégrité des engagements pris avec autrui.

### #12 — Décroissance temporelle = exponentielle, demi-vie 180 jours
- **Statut** : adopté
- **Décision** : `decay = 0.5 ** (ageDays / 180)`. Une besa de 6 mois pèse 50%, d'1 an pèse 25%.

### #13 — Barème score : Tenue +10, Ghost -10, Aveu -7 (× poids)
- **Statut** : adopté
- **Contexte** : brief dit "reconnaissance honnête = -30% impact négatif vs ghosting".
- **Décision** : `delta = outcome_factor × weight_final` où `outcome_factor ∈ {+10 (kept), -10 (ghost), -7 (aveu honnête), 0 (in_dispute)}`. Aveu honnête = -30% vs ghost arithmétiquement.

### #14 — Détection comptes liés : téléphone OU (IP + corrélation 24h)
- **Statut** : adopté
- **Décision** : IP seule = trop de faux positifs (familles, coworking, VPN). Critères retenus :
  - Téléphone racine partagé OU
  - Même IP + besa signée mutuellement dans les 24h
- D'abord logger (score "suspect" interne), pénaliser (poids ÷ 5) au-delà d'un seuil ajustable.

### #15 — Stack ORM : pas d'ORM, client Supabase JS direct (pour MVP)
- **Statut** : adopté pour MVP
- **Options évaluées** :
  - Drizzle — type-safe SQL, bonne intégration Postgres
  - Prisma — DX top, mais runtime lourd, schémas redondants avec Supabase
  - **Client Supabase JS direct** — **choisi**
- **Décision** : RLS native suffit, ORM ajouterait une couche. Migration vers Drizzle envisageable en Sprint 4+ si la complexité augmente.

### #16 — tsconfig durci au-delà de `strict: true`
- **Statut** : adopté
- **Décision** : ajout de `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Target `ES2022`.
- **Conséquence** : `array[i]` retourne `T | undefined` — plus de vérifications à coder, moins de bugs en prod.

### #17 — Next.js 16 (et non Next.js 14 strict)
- **Statut** : adopté
- **Contexte** : brief dit "Next.js 14+". `create-next-app@latest` a installé Next.js 16.2.6.
- **Décision** : on garde Next.js 16. Breaking changes vs 14 = async `params`/`searchParams` (déjà en 15), Turbopack stable, React 19 Compiler par défaut. Pas de risque pour le MVP.

### #18 — Tailwind 4 (CSS-first config)
- **Statut** : adopté (imposé par create-next-app)
- **Conséquence** : pas de `tailwind.config.ts`. Tokens dans `app/globals.css` via `@theme`. Plugin PostCSS `@tailwindcss/postcss`.

### #19 — shadcn/ui base-color = zinc
- **Statut** : adopté
- **Décision** : neutre, accordée avec le ton sobre. Override des couleurs spécifiques via tokens Tailwind 4 dans `globals.css`.

---

## Format pour les futures décisions

```markdown
### #N — Titre court de la décision
- **Statut** : adopté | reverted | en discussion
- **Contexte** : pourquoi la question s'est posée
- **Options évaluées** : (si plusieurs, avec un argument chacune)
- **Décision** : ce qu'on a retenu
- **Conséquence** : (si pertinent — risques, dette, follow-up)
```
