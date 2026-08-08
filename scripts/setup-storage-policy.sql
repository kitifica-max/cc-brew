-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new

-- Allow anon (PWA) to upload files to the uploads bucket
CREATE POLICY "anon_insert_uploads" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'uploads');
