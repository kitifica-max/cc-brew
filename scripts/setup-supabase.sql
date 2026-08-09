-- CC Controller — configuración de Supabase
-- Ejecutar completo en el SQL Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Qué hace:
--   1. Tabla de usuarios autorizados (una fila por persona que puede controlar el Mac).
--   2. Realtime Authorization: el canal `session:<id>` pasa a ser privado.
--   3. Storage: solo un usuario autorizado sube archivos, y solo bajo su propia sesión.
--
-- Sin esto, el canal de Supabase es público: cualquiera con la anon key puede
-- ejecutar comandos en el Mac y leer todo lo que responde Claude.

-- ─────────────────────────────────────────────────────────────
-- 1. Usuarios autorizados
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cc_allowed_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id text        NOT NULL,
  active     boolean     NOT NULL DEFAULT true,
  -- Punto de enganche para monetización: un webhook de cobro pone active=false
  -- o mueve expires_at cuando la suscripción vence.
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cc_allowed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cc_read_own_row" ON public.cc_allowed_users;
CREATE POLICY "cc_read_own_row" ON public.cc_allowed_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Nadie escribe desde el cliente: altas y bajas van con la service_role key.

-- ─────────────────────────────────────────────────────────────
-- 2. Predicado de acceso
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cc_can_access(channel_topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cc_allowed_users u
    WHERE u.user_id = auth.uid()
      AND u.active
      AND (u.expires_at IS NULL OR u.expires_at > now())
      AND channel_topic = 'session:' || u.session_id
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Realtime Authorization (canal privado)
-- ─────────────────────────────────────────────────────────────
-- La service_role key del desktop salta RLS, así que Electron sigue funcionando.

DROP POLICY IF EXISTS "cc_realtime_read" ON realtime.messages;
CREATE POLICY "cc_realtime_read" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND public.cc_can_access((SELECT realtime.topic()))
  );

DROP POLICY IF EXISTS "cc_realtime_write" ON realtime.messages;
CREATE POLICY "cc_realtime_write" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND public.cc_can_access((SELECT realtime.topic()))
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Storage (bucket `uploads`, privado)
-- ─────────────────────────────────────────────────────────────
-- Las claves tienen la forma `uploads/<session_id>/<timestamp>-<nombre>`,
-- así que el segundo segmento identifica la sesión.

DROP POLICY IF EXISTS "anon_insert_uploads" ON storage.objects;  -- política insegura de versiones anteriores

DROP POLICY IF EXISTS "cc_upload_own_session" ON storage.objects;
CREATE POLICY "cc_upload_own_session" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND public.cc_can_access('session:' || split_part(name, '/', 2))
  );

DROP POLICY IF EXISTS "cc_read_own_session" ON storage.objects;
CREATE POLICY "cc_read_own_session" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'uploads'
    AND public.cc_can_access('session:' || split_part(name, '/', 2))
  );

-- ─────────────────────────────────────────────────────────────
-- 5. Darte de alta a ti mismo
-- ─────────────────────────────────────────────────────────────
-- Entra una vez en la PWA con tu correo (magic link) para que exista tu usuario,
-- y después ejecuta esto sustituyendo el correo y el SESSION_ID:

-- INSERT INTO public.cc_allowed_users (user_id, session_id)
-- SELECT id, 'cc-session-01' FROM auth.users WHERE email = 'tu@correo.com'
-- ON CONFLICT (user_id) DO UPDATE SET session_id = EXCLUDED.session_id, active = true;
