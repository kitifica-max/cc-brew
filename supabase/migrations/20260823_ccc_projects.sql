CREATE TABLE IF NOT EXISTS public.ccc_projects (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name        TEXT        NOT NULL DEFAULT 'Nuevo proyecto',
  idea_text   TEXT,
  claude_md   TEXT,
  session_id  TEXT,
  pending_questions JSONB,
  pending_answers   JSONB,
  nodes       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  vectors     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  model       TEXT        NOT NULL DEFAULT 'claude-sonnet-4-6',
  effort      TEXT        NOT NULL DEFAULT 'medium',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ccc_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON public.ccc_projects
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
