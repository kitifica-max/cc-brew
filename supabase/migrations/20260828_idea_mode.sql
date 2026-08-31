-- Enhancer de prompt + modo Idea/Problema: el modo elegido en IdeaCapture
-- viaja con el proyecto y condiciona el cuestionario, el semáforo y el CLAUDE.md.

alter table public.ccc_projects
  add column if not exists idea_mode text not null default 'idea';
