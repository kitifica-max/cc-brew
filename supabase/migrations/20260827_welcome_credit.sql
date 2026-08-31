-- 1 crédito gratis de bienvenida para cuentas nuevas.
-- El trigger on_auth_user_created_ccc inserta la fila de ccc_users especificando
-- solo supabase_user_id — minutes_balance queda en el default de la columna.
-- Cambiar ese default a 1 no afecta usuarios existentes (solo aplica a inserts futuros).
alter table public.ccc_users
  alter column minutes_balance set default 1;
