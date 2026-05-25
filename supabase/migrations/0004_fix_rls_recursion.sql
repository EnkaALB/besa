-- ============================================================
-- Besa — Migration 0004 : Fix RLS infinite recursion
-- Date : 2026-05-24
-- ============================================================
-- BUG (présent depuis migration 0001) :
--   Les policies `besas_select_member_or_public` et `parties_select_member`
--   se référencent mutuellement (besas → besa_parties → besa_parties),
--   créant une récursion infinie détectée par Postgres.
--
-- Symptôme : "infinite recursion detected in policy for relation
--           'besa_parties'" lors de tout SELECT/INSERT-RETURNING sur besas
--           ou besa_parties dès qu'il y a au moins une ligne dans besas.
--
-- FIX : extraire le check de membership dans une fonction SECURITY DEFINER
--       qui bypass RLS pour le SELECT interne sur besa_parties.
-- ============================================================

-- 1. Fonction helper : "auth.uid() est-il membre de la besa donnée ?"
--    SECURITY DEFINER = s'exécute avec les privilèges du propriétaire
--    de la fonction (postgres / supabase_admin), donc bypass RLS pour
--    le SELECT sur besa_parties à l'intérieur.
--    STABLE = pas d'effets de bord (Postgres peut optimiser).
CREATE OR REPLACE FUNCTION public.is_besa_member(p_besa_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.besa_parties
    WHERE besa_id = p_besa_id
      AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_besa_member(uuid) TO authenticated;

-- 2. Réécriture de la policy SELECT sur besas (utilise la fonction)
DROP POLICY IF EXISTS besas_select_member_or_public ON public.besas;

CREATE POLICY besas_select_member_or_public
  ON public.besas FOR SELECT
  USING (
    creator_id = auth.uid()
    OR public.is_besa_member(id)
    OR (
      is_public = true
      AND status IN ('resolved_kept', 'resolved_broken', 'ghosted', 'in_dispute')
    )
  );

-- 3. Réécriture de la policy SELECT sur besa_parties (utilise la fonction)
DROP POLICY IF EXISTS parties_select_member ON public.besa_parties;

CREATE POLICY parties_select_member
  ON public.besa_parties FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_besa_member(besa_id)
  );
