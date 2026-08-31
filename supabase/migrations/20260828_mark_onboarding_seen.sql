-- ccc_users no tiene policy de UPDATE (por diseño, para que el cliente no
-- pueda tocar minutes_balance/api_key directo) — así que markOnboardingSeen()
-- desde el cliente quedaba en no-op silencioso y el tour volvía a salir
-- siempre. RPC angosta, mismo patrón que descontar_minuto.
CREATE OR REPLACE FUNCTION mark_onboarding_seen(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ccc_users
  SET onboarding_seen = true
  WHERE supabase_user_id = p_user_id;
END;
$$;
