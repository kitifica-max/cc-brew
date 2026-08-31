-- Descuenta 1 minuto del balance del usuario.
-- Retorna el nuevo balance, o NULL si el balance era 0 (no se descontó).
CREATE OR REPLACE FUNCTION descontar_minuto(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE ccc_users
  SET minutes_balance = minutes_balance - 1
  WHERE id = p_user_id AND minutes_balance > 0
  RETURNING minutes_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;
