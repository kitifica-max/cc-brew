-- Add v2 columns for idea→questionnaire→semaforo→document flow
ALTER TABLE public.ccc_sessions
  ADD COLUMN IF NOT EXISTS idea_text TEXT,
  ADD COLUMN IF NOT EXISTS questionnaire JSONB,
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS semaforo JSONB,
  ADD COLUMN IF NOT EXISTS claude_md TEXT;
