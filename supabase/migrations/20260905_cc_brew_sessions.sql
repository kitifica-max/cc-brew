-- CC Brew: tablas sin auth (modelo MCP+Skill gratuito)

create table if not exists public.cc_brew_sessions (
  id            text primary key,
  project_name  text not null,
  status        text not null default 'started',
  idea_text     text,
  questionnaire jsonb,
  answers       jsonb,
  evaluation    jsonb,
  decision      text,
  brief_md      text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create table if not exists public.cc_brew_events (
  id         uuid primary key default gen_random_uuid(),
  event      text not null,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);
