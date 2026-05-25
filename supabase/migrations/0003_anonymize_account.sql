-- ============================================================
-- Besa — Migration 0003 : RPC anonymize_account
-- Date : 2026-05-24
-- ============================================================
-- RGPD : un user peut demander la suppression de son compte.
-- On anonymise plutôt que DELETE pour préserver l'intégrité des
-- besas signées avec d'autres (cf. DECISIONS.md #11 + considérant 26).
-- ============================================================
--
-- Cette RPC :
--   1. Vérifie auth.uid()
--   2. UPDATE public.users : nom -> "Compte supprimé", email/phone/avatar/bio -> NULL,
--      username -> "deleted_<uuid>", account_status -> 'anonymized'
--   3. Le client doit ensuite appeler supabase.auth.signOut() côté browser
--      ET il faut un appel admin (service_role) pour DELETE de auth.users.
--      (cf. /api/me/delete qui orchestre tout)

CREATE OR REPLACE FUNCTION public.anonymize_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
  SET
    full_name      = 'Compte supprimé',
    email          = NULL,
    phone          = NULL,
    avatar_url     = NULL,
    bio            = NULL,
    username       = 'deleted_' || replace(gen_random_uuid()::text, '-', ''),
    account_status = 'anonymized',
    updated_at     = now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.anonymize_account() TO authenticated;
