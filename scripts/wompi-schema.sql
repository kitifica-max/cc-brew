-- Run this in the Supabase SQL editor

create table if not exists public.user_access (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  trial_ends_at   timestamptz not null default (now() + interval '7 days'),
  paid_at         timestamptz,
  wompi_txn_id    text,
  created_at      timestamptz not null default now()
);

alter table public.user_access enable row level security;

-- Users can read their own row
create policy "users read own access"
  on public.user_access for select
  using (auth.uid() = user_id);

-- Users can insert their own row (for existing users before trigger)
create policy "users insert own access"
  on public.user_access for insert
  with check (auth.uid() = user_id);

-- Auto-create trial row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_access (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
