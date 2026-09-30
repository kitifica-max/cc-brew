-- CC Brew: "Idea Express" — check pago de $1.29 desde el landing (mobile, sin
-- cuenta). Cada fila es un intento; check_id (= id) se manda a Wompi como
-- datosAdicionales para correlacionar el webhook, y el cliente lo usa para
-- pollear el resultado tras el redirect 3DS.

create table if not exists public.cc_brew_express_checks (
  id           uuid primary key default gen_random_uuid(),
  idea_text    text not null,
  answers      jsonb not null,
  status       text not null default 'pending_payment', -- pending_payment | done | failed
  verdict      jsonb,
  wompi_ref    text,
  price_cents  integer not null default 129,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

alter table public.cc_brew_express_checks enable row level security;
-- Sin policy de SELECT/UPDATE directa: todo acceso pasa por la RPC de abajo o
-- por las edge functions con service role. Evita que alguien liste filas ajenas.

-- Lectura pública SOLO por id exacto (capability token, no hay forma de listar).
create or replace function public.cc_brew_express_check_get(p_id uuid)
returns table (status text, verdict jsonb)
language sql security definer set search_path = public as $$
  select status, verdict from public.cc_brew_express_checks where id = p_id;
$$;

grant execute on function public.cc_brew_express_check_get(uuid) to anon, authenticated;
