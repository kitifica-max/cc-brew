-- Permite resumir la revisión de follow-ups del semáforo si el usuario
-- cierra la app antes de decidir qué hacer con ellos, en vez de saltar
-- directo al CLAUDE.md como si ya estuviera confirmado.
alter table public.ccc_projects
  add column if not exists pending_followup_answers jsonb,
  add column if not exists document_confirmed boolean not null default false;
