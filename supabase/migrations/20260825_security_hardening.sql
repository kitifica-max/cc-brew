-- Hardening a partir de la auditoría de QA del 2026-08-25.
--
-- 1) descontar_minuto/acreditar_minutos no verificaban que el caller fuera
--    dueño de p_user_id — cualquier usuario autenticado podía vaciar el
--    saldo de otra cuenta o acreditarse minutos sin pagar.
-- 2) Ninguna función SECURITY DEFINER fijaba search_path.
-- 3) ccc_projects.session_id no tenía foreign key real hacia ccc_sessions.
-- 4) 2 políticas RLS no usaban DROP POLICY IF EXISTS antes de crear.

-- ─────────────────────────────────────────────────────────────────────────
-- descontar_minuto: único caller real es la PWA (web/app/page.js), siempre
-- con el user.id del propio usuario logueado (rol `authenticated`, nunca
-- service_role). Se agrega el chequeo de dueño + se restringe el grant.
create or replace function public.descontar_minuto(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_balance integer;
begin
  if auth.uid() is distinct from p_user_id then
    return null;
  end if;

  update public.ccc_users
  set minutes_balance = minutes_balance - 1
  where supabase_user_id = p_user_id and minutes_balance > 0
  returning minutes_balance into v_new_balance;

  return v_new_balance;
end;
$$;

revoke execute on function public.descontar_minuto(uuid) from public;
revoke execute on function public.descontar_minuto(uuid) from anon;
grant execute on function public.descontar_minuto(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- acreditar_minutos: único caller real es el webhook de Wompi
-- (supabase/functions/webhook-wompi-ccc), que usa el SERVICE_ROLE_KEY —
-- ese rol nunca tiene auth.uid(), así que acá el chequeo correcto NO es
-- auth.uid() = p_user_id (rompería el acreditado real de pagos): es
-- restringir el EXECUTE únicamente a service_role.
create or replace function public.acreditar_minutos(p_user_id uuid, p_minutos int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.ccc_users
  set minutes_balance = minutes_balance + p_minutos
  where supabase_user_id = p_user_id;
end;
$$;

revoke execute on function public.acreditar_minutos(uuid, int) from public;
revoke execute on function public.acreditar_minutos(uuid, int) from anon;
revoke execute on function public.acreditar_minutos(uuid, int) from authenticated;
grant execute on function public.acreditar_minutos(uuid, int) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- handle_new_ccc_user: trigger de auth.users, no es invocable por RPC
-- directo (Postgres no permite llamar funciones RETURNS trigger fuera de
-- un trigger), pero se fija search_path igual por consistencia.
create or replace function public.handle_new_ccc_user()
returns trigger as $$
begin
  insert into public.ccc_users (supabase_user_id)
  values (new.id)
  on conflict (supabase_user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ─────────────────────────────────────────────────────────────────────────
-- ccc_projects.session_id: sin FK real hacia ccc_sessions.id. Confirmado
-- 0 filas huérfanas antes de aplicar (select count(*) ... not exists).
-- ON DELETE SET NULL: borrar una sesión del flujo Skill/MCP no debe borrar
-- el proyecto/CLAUDE.md ya generado en la PWA.
alter table public.ccc_projects
  add constraint ccc_projects_session_id_fkey
  foreign key (session_id) references public.ccc_sessions(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────
-- Políticas RLS sin guard — mismo comportamiento, ahora reaplicables.
drop policy if exists "owner_all" on public.ccc_projects;
create policy "owner_all" on public.ccc_projects
  for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_select_own_txn" on public.minutes_transactions;
create policy "users_select_own_txn" on public.minutes_transactions
  for select using (user_id = auth.uid());
