-- "Trae tu API" ($39 pago único) + nueva política de bienvenida: 3 proyectos
-- de prueba gratis (antes 1), en un contador separado de los créditos
-- comprados — para que no se mezclen entre sí.

-- Créditos comprados: el default vuelve a 0 — el free trial ahora vive en
-- trial_credits, no acá. No afecta el saldo de cuentas ya existentes.
alter table public.ccc_users
  alter column minutes_balance set default 0;

alter table public.ccc_users
  add column if not exists trial_credits integer not null default 3,
  add column if not exists byo_api_active boolean not null default false,
  add column if not exists anthropic_api_key_enc text;

-- Cuentas ya existentes: si nunca tocaron su saldo de bienvenida (siguen en
-- el 1 original), quedan con 0 de crédito comprado + 3 de prueba — mismo
-- total de bienvenida (o mejor) que la política vieja, sin regalar de más a
-- quien ya gastó su crédito original.
update public.ccc_users
  set trial_credits = 3, minutes_balance = 0
  where minutes_balance = 1;

-- descontar_minuto: prueba gratis primero, crédito comprado después.
-- Cuentas "Trae tu API" (byo_api_active) no descuentan nada — uso ilimitado.
create or replace function public.descontar_minuto(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_trial integer;
  v_balance integer;
  v_byo boolean;
begin
  if auth.uid() is distinct from p_user_id then
    return null;
  end if;

  select byo_api_active into v_byo from public.ccc_users where supabase_user_id = p_user_id;
  if v_byo then
    return -1; -- ilimitado, nada que descontar
  end if;

  update public.ccc_users
  set trial_credits = trial_credits - 1
  where supabase_user_id = p_user_id and trial_credits > 0
  returning trial_credits into v_trial;

  if v_trial is not null then
    return v_trial;
  end if;

  update public.ccc_users
  set minutes_balance = minutes_balance - 1
  where supabase_user_id = p_user_id and minutes_balance > 0
  returning minutes_balance into v_balance;

  return v_balance;
end;
$$;

-- Activa el plan "Trae tu API" tras un pago Wompi confirmado (llamada desde
-- el webhook con service role, mismo patrón que acreditar_minutos).
create or replace function public.activar_byo_api(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update public.ccc_users set byo_api_active = true where supabase_user_id = p_user_id;
end;
$$;
