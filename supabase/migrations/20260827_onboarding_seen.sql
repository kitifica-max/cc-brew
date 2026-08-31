-- Marca si la cuenta ya vio el tour de inducción — una sola vez por cuenta,
-- no por dispositivo (se guarda en ccc_users, no en localStorage).
alter table public.ccc_users
  add column if not exists onboarding_seen boolean not null default false;
