-- ============================================================
-- Besa — Migration 0002 : Storage bucket pour les avatars
-- Date : 2026-05-24
-- ============================================================
-- Crée un bucket public 'avatars' où chaque user peut uploader
-- son propre avatar (path : <user_uuid>/avatar.<ext>).
-- Lecture publique (les avatars sont affichés sur les profils publics).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique
CREATE POLICY "Avatars publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Un user ne peut écrire que dans son propre dossier <user_id>/
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
