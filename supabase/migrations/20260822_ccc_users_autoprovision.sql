-- INSERT policy: usuarios pueden crear su propio registro
drop policy if exists "users_insert_own" on public.ccc_users;
create policy "users_insert_own" on public.ccc_users
  for insert with check (supabase_user_id = auth.uid());

-- Trigger: auto-crear registro ccc_users en cada signup
create or replace function public.handle_new_ccc_user()
returns trigger as $$
begin
  insert into public.ccc_users (supabase_user_id)
  values (new.id)
  on conflict (supabase_user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_ccc on auth.users;
create trigger on_auth_user_created_ccc
  after insert on auth.users
  for each row execute procedure public.handle_new_ccc_user();
