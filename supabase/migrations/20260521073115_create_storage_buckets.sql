/*
  # Create Storage Buckets for DreamBurst Media

  1. New Storage Buckets
    - `dream-audio`: Stores voice recordings from DreamBurst feature
    - `dream-photos`: Stores photo uploads from DreamBurst feature

  2. Security
    - Both buckets are private (not public)
    - Users can only upload/read their own files
    - File size limit: 10MB for audio, 5MB for photos
    - Allowed MIME types: audio/webm, audio/ogg for audio; image/jpeg, image/png, image/webp for photos

  3. Storage Policies
    - INSERT: Users can upload files to their own folder (user_id/filename)
    - SELECT: Users can read only their own files
    - DELETE: Users can delete only their own files
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('dream-audio', 'dream-audio', false, 10485760, ARRAY['audio/webm','audio/ogg','audio/mp4']),
  ('dream-photos', 'dream-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- dream-audio policies
CREATE POLICY "Users can upload own audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dream-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dream-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dream-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- dream-photos policies
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dream-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dream-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dream-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
