-- ============================================================
-- Besa — Schéma initial (PROPOSITION, non appliquée)
-- Cible  : Supabase Postgres 15+ (région EU Frankfurt)
-- Date   : 2026-05-24
-- Statut : EN ATTENTE DE VALIDATION UTILISATEUR
-- ============================================================
-- Ce fichier est une PROPOSITION. Il n'est PAS encore une migration.
-- Une fois validé, il sera déplacé vers
--   supabase/migrations/0001_initial.sql
-- et appliqué via `supabase db push`.
-- ============================================================

-- ----- Extensions -----
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- username insensible à la casse

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE besa_status AS ENUM (
  'draft',                 -- créée, en attente de signature du second
  'active',                -- les deux ont signé, en cours
  'pending_validation',    -- échéance atteinte, attend les choix Tenue/Non tenue/Contestée
  'resolved_kept',         -- les deux disent : tenue
  'resolved_broken',       -- les deux disent : non tenue (reconnaissance honnête)
  'in_dispute',            -- désaccord, médiation requise (phase 4)
  'ghosted'                -- l'un n'a jamais répondu (15j)
);

CREATE TYPE besa_role AS ENUM ('creator', 'cosigner');

CREATE TYPE validation_choice AS ENUM ('pending', 'kept', 'broken', 'contested');

CREATE TYPE score_event_reason AS ENUM (
  'besa_kept',                 -- +10 × poids_final
  'besa_ghost',                -- -10 × poids_final (sur le ghoster)
  'besa_broken_honest',        --  -7 × poids_final (-30 % vs ghost)
  'besa_in_dispute_neutral',   --  delta 0 (audit uniquement)
  'penalty_linked_accounts'    --  pondération ÷ 5 si comptes liés détectés
);

CREATE TYPE account_status AS ENUM ('active', 'anonymized');

-- ============================================================
-- TABLE : users (extension publique de auth.users)
-- ============================================================

CREATE TABLE public.users (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              citext UNIQUE,                          -- NULL avant onboarding
  full_name             text,
  avatar_url            text,                                   -- chemin Supabase Storage
  bio                   text,
  email                 text,                                   -- mirror auth.users.email (NULL après anonymisation)
  phone                 text,                                   -- nullable en V1 (magic link), utile pour détection comptes liés
  score_visible_public  boolean       NOT NULL DEFAULT true,
  account_status        account_status NOT NULL DEFAULT 'active',
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT username_format CHECK (
    username IS NULL OR username ~ '^[a-z0-9_-]{3,30}$'
  ),
  CONSTRAINT bio_length CHECK (
    bio IS NULL OR length(bio) BETWEEN 1 AND 280
  ),
  CONSTRAINT full_name_length CHECK (
    full_name IS NULL OR length(full_name) BETWEEN 1 AND 100
  )
);

CREATE INDEX users_created_at_idx ON public.users (created_at DESC);

-- ============================================================
-- TABLE : besas
-- ============================================================

CREATE TABLE public.besas (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    uuid         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title         text         NOT NULL,
  description   text,
  deadline      timestamptz  NOT NULL,
  status        besa_status  NOT NULL DEFAULT 'draft',
  weight_final  numeric(3,1),                                   -- moyenne des deux poids ressentis (NULL avant 'active')
  is_public     boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  activated_at  timestamptz,
  resolved_at   timestamptz,

  CONSTRAINT title_length        CHECK (length(title) BETWEEN 3 AND 200),
  CONSTRAINT description_length  CHECK (description IS NULL OR length(description) <= 2000),
  CONSTRAINT weight_final_range  CHECK (weight_final IS NULL OR (weight_final >= 1 AND weight_final <= 10)),
  CONSTRAINT deadline_after_creation CHECK (deadline > created_at)
);

CREATE INDEX besas_creator_idx ON public.besas (creator_id);

-- Pour le cron quotidien qui passe les besas à 'pending_validation'
CREATE INDEX besas_active_deadline_idx
  ON public.besas (deadline)
  WHERE status IN ('active', 'pending_validation');

-- Pour la chronologie publique d'un profil
CREATE INDEX besas_public_resolved_idx
  ON public.besas (creator_id, created_at DESC)
  WHERE is_public = true
    AND status IN ('resolved_kept', 'resolved_broken', 'ghosted');

-- ============================================================
-- TABLE : besa_parties (membres d'une besa)
-- ============================================================

CREATE TABLE public.besa_parties (
  besa_id            uuid              NOT NULL REFERENCES public.besas(id) ON DELETE CASCADE,
  user_id            uuid              NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  role               besa_role         NOT NULL,
  weight_ressenti    smallint,                                  -- NULL pour le cosigner avant signature
  signed_at          timestamptz,
  validation_choice  validation_choice NOT NULL DEFAULT 'pending',
  validated_at       timestamptz,

  PRIMARY KEY (besa_id, user_id),
  CONSTRAINT weight_range CHECK (
    weight_ressenti IS NULL OR (weight_ressenti BETWEEN 1 AND 10)
  )
);

-- V1 : une besa = exactement 1 créateur + 1 cosigner
CREATE UNIQUE INDEX besa_parties_role_unique ON public.besa_parties (besa_id, role);
CREATE INDEX besa_parties_user_idx ON public.besa_parties (user_id);

-- ============================================================
-- TABLE : besa_invites (tokens de partage)
-- ============================================================

CREATE TABLE public.besa_invites (
  token             text        PRIMARY KEY,
  besa_id           uuid        NOT NULL REFERENCES public.besas(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at           timestamptz,
  used_by_user_id   uuid        REFERENCES public.users(id),

  CONSTRAINT token_format CHECK (token ~ '^[A-Za-z0-9]{12}$')
);

CREATE INDEX besa_invites_besa_idx ON public.besa_invites (besa_id);

-- ============================================================
-- TABLE : score_events (audit du Besa Score)
-- ============================================================

CREATE TABLE public.score_events (
  id           uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid                NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  besa_id      uuid                REFERENCES public.besas(id) ON DELETE SET NULL,
  delta        numeric             NOT NULL,
  weight_used  numeric(3,1)        NOT NULL,
  reason       score_event_reason  NOT NULL,
  created_at   timestamptz         NOT NULL DEFAULT now()
);

CREATE INDEX score_events_user_created_idx
  ON public.score_events (user_id, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-création du profil public.users à l'inscription auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.besas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.besa_parties  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.besa_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_events  ENABLE ROW LEVEL SECURITY;

-- ----- users -----
-- Lecture publique : la page /u/{username} est consultable par tous.
-- L'app ne sélectionne PAS email/phone côté client pour les profils d'autrui.
-- Alternative plus stricte possible : créer une VIEW publique avec colonnes filtrées.
CREATE POLICY users_select_all
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT : via trigger handle_new_user(), pas de policy directe.
-- DELETE : interdit, on passe par une RPC d'anonymisation (à venir Sprint 1).

-- ----- besas -----

CREATE POLICY besas_select_member_or_public
  ON public.besas FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.besa_parties bp
      WHERE bp.besa_id = besas.id AND bp.user_id = auth.uid()
    )
    OR (
      is_public = true
      AND status IN ('resolved_kept', 'resolved_broken', 'ghosted', 'in_dispute')
    )
  );

CREATE POLICY besas_insert_own
  ON public.besas FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY besas_update_draft_own
  ON public.besas FOR UPDATE
  USING (creator_id = auth.uid() AND status = 'draft')
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY besas_delete_draft_own
  ON public.besas FOR DELETE
  USING (creator_id = auth.uid() AND status = 'draft');

-- ----- besa_parties -----

CREATE POLICY parties_select_member
  ON public.besa_parties FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.besa_parties bp
      WHERE bp.besa_id = besa_parties.besa_id AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY parties_insert_self
  ON public.besa_parties FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY parties_update_own_validation
  ON public.besa_parties FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----- besa_invites -----

-- Le token EST l'authentification (12 chars base62 ≈ 71 bits).
-- Knowing the token suffit pour SELECT.
CREATE POLICY invites_select_anyone
  ON public.besa_invites FOR SELECT
  USING (true);

CREATE POLICY invites_insert_creator
  ON public.besa_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.besas
      WHERE id = besa_id AND creator_id = auth.uid()
    )
  );

-- Pas d'UPDATE direct : passe par la RPC consume_invite().

-- ----- score_events -----

CREATE POLICY score_events_select_own
  ON public.score_events FOR SELECT
  USING (user_id = auth.uid());

-- Pas d'INSERT/UPDATE/DELETE direct : uniquement via service_role
-- (calcul de score côté serveur en Sprint 3).

-- ============================================================
-- RPC : consume_invite — consommation atomique d'un token
-- ============================================================
-- Appelée par le second signataire depuis /b/{token}.
-- Vérifie validité du token, plafond anti-abus, calcule weight_final,
-- crée le besa_party cosigner et bascule la besa en 'active'.
-- Tout est dans une transaction (SECURITY DEFINER) pour atomicité.

CREATE OR REPLACE FUNCTION public.consume_invite(
  p_token            text,
  p_weight_ressenti  smallint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite          public.besa_invites%ROWTYPE;
  v_besa            public.besas%ROWTYPE;
  v_creator_weight  smallint;
  v_weight_final    numeric(3,1);
BEGIN
  IF p_weight_ressenti < 1 OR p_weight_ressenti > 10 THEN
    RAISE EXCEPTION 'Poids ressenti invalide (1-10)' USING ERRCODE = 'P0001';
  END IF;

  -- Verrouille le token (anti-race)
  SELECT * INTO v_invite
  FROM public.besa_invites
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token invalide' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Token déjà utilisé' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Token expiré' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_besa FROM public.besas WHERE id = v_invite.besa_id;

  IF v_besa.creator_id = auth.uid() THEN
    RAISE EXCEPTION 'Le créateur ne peut pas signer sa propre besa'
      USING ERRCODE = 'P0001';
  END IF;

  -- Plafond anti-abus : 3 besas/jour entre 2 mêmes users
  IF (
    SELECT count(*)
    FROM public.besas b
    JOIN public.besa_parties bp ON bp.besa_id = b.id
    WHERE b.creator_id = v_besa.creator_id
      AND bp.user_id = auth.uid()
      AND b.activated_at > now() - interval '24 hours'
  ) >= 3 THEN
    RAISE EXCEPTION 'Plafond de 3 besas/jour atteint avec ce créateur'
      USING ERRCODE = 'P0001';
  END IF;

  -- Récupère le poids du créateur
  SELECT weight_ressenti INTO v_creator_weight
  FROM public.besa_parties
  WHERE besa_id = v_besa.id AND role = 'creator';

  v_weight_final := round(
    (v_creator_weight::numeric + p_weight_ressenti::numeric) / 2.0,
    1
  );

  -- Insère le cosigner
  INSERT INTO public.besa_parties (besa_id, user_id, role, weight_ressenti, signed_at)
  VALUES (v_besa.id, auth.uid(), 'cosigner', p_weight_ressenti, now());

  -- Active la besa
  UPDATE public.besas
  SET status        = 'active',
      weight_final  = v_weight_final,
      activated_at  = now()
  WHERE id = v_besa.id;

  -- Consomme le token
  UPDATE public.besa_invites
  SET used_at         = now(),
      used_by_user_id = auth.uid()
  WHERE token = p_token;

  RETURN v_besa.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_invite(text, smallint) TO authenticated;

-- ============================================================
-- À compléter en Sprint 3 (workflow d'échéance + score) :
--   - RPC public.cron_expire_active_besas()    -- passe à pending_validation
--   - RPC public.detect_ghosters()             -- ghoster après 15j sans réponse
--   - RPC public.resolve_besa(besa_id)         -- décide kept/broken/dispute
--   - Inserts dans score_events depuis ces RPC (côté service_role)
-- ============================================================
