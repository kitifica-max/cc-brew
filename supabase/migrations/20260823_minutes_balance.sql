-- Minutos de procesamiento en ccc_users
alter table public.ccc_users
  add column if not exists minutes_balance int not null default 0;

-- Tabla de transacciones de minutos
create table if not exists public.minutes_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),
  pack       text not null,
  minutos    int not null,
  monto      numeric(8,2) not null,
  wompi_ref  text unique,
  created_at timestamptz not null default now()
);

alter table public.minutes_transactions enable row level security;

create policy "users_select_own_txn" on public.minutes_transactions
  for select using (user_id = auth.uid());

-- Función atómica para acreditar minutos
create or replace function public.acreditar_minutos(p_user_id uuid, p_minutos int)
returns void as $$
begin
  update public.ccc_users
  set minutes_balance = minutes_balance + p_minutos
  where supabase_user_id = p_user_id;
end;
$$ language plpgsql security definer;
