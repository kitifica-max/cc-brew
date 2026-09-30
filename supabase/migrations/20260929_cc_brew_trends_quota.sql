-- CC Brew: tope mensual de llamadas reales a SerpApi. El plan free tiene 250/mes
-- compartidas entre TODOS los usuarios del MCP publico (no hay key por usuario).
-- cc_brew_trends_quota_take incrementa atomicamente y devuelve false si ya se
-- llego al tope, para frenar el gasto sin tumbar el tool para siempre.

create table if not exists public.cc_brew_trends_quota (
  month text primary key,  -- 'YYYY-MM'
  used  integer not null default 0
);

create or replace function public.cc_brew_trends_quota_take(p_month text, p_cap integer)
returns boolean
language plpgsql
as $$
declare
  v_used integer;
begin
  insert into public.cc_brew_trends_quota (month, used) values (p_month, 0)
  on conflict (month) do nothing;

  update public.cc_brew_trends_quota
  set used = used + 1
  where month = p_month and used < p_cap
  returning used into v_used;

  return v_used is not null;
end;
$$;
