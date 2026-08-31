-- Pivote CC Creator → CC Brew: nuevas fuentes de contexto.
-- Perfiles de público objetivo reutilizables entre proyectos + lineamientos
-- de marca y perfil de cliente por proyecto.

create table if not exists public.ccc_audience_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  role_level    text,
  pain_point    text,
  objection     text,
  success_signal text,
  buying_stage  text,
  channel       text,
  created_at    timestamptz not null default now()
);

alter table public.ccc_audience_profiles enable row level security;

drop policy if exists "owner_all" on public.ccc_audience_profiles;
create policy "owner_all" on public.ccc_audience_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.ccc_projects
  add column if not exists client_profile text,
  add column if not exists brand_profile text,
  add column if not exists audience_profile jsonb,
  add column if not exists audience_profile_id uuid references public.ccc_audience_profiles(id) on delete set null;

alter table public.ccc_sessions
  add column if not exists client_profile text,
  add column if not exists brand_profile text,
  add column if not exists audience_profile jsonb;
