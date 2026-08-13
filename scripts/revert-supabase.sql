-- CC Controller — REVERT del setup-supabase.sql
-- Ejecutar en el SQL Editor del proyecto EQUIVOCADO para deshacer todo.
-- https://supabase.com/dashboard/project/_/sql/new

-- ─────────────────────────────────────────────────────────────
-- 1. Políticas de Storage
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cc_upload_own_session" ON storage.objects;
DROP POLICY IF EXISTS "cc_read_own_session"   ON storage.objects;

-- ─────────────────────────────────────────────────────────────
-- 2. Políticas de Realtime
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cc_realtime_read"  ON realtime.messages;
DROP POLICY IF EXISTS "cc_realtime_write" ON realtime.messages;

-- ─────────────────────────────────────────────────────────────
-- 3. Función de acceso
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.cc_can_access(text);

-- ─────────────────────────────────────────────────────────────
-- 4. Tabla de usuarios autorizados
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.cc_allowed_users CASCADE;
