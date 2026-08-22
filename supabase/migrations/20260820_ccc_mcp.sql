-- supabase/migrations/20260820_ccc_mcp.sql

-- Usuarios CCC con API key permanente
create table if not exists public.ccc_users (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid references auth.users(id) on delete cascade unique,
  api_key text unique not null default concat('uk_', replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz default now()
);

-- Sesiones de build
create table if not exists public.ccc_sessions (
  id text primary key,
  user_id uuid references public.ccc_users(id) on delete cascade not null,
  project_name text not null,
  brief_content text,
  status text not null default 'pending',
  phase text,
  preview_url text,
  summary text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- RLS
alter table public.ccc_users enable row level security;
alter table public.ccc_sessions enable row level security;

-- Usuarios leen su propio registro
create policy "users_read_own" on public.ccc_users
  for select using (supabase_user_id = auth.uid());

-- Usuarios leen sus propias sesiones
create policy "sessions_read_own" on public.ccc_sessions
  for select using (
    user_id in (select id from public.ccc_users where supabase_user_id = auth.uid())
  );

-- Service key bypasa RLS (el MCP server usa SUPABASE_SERVICE_KEY)
