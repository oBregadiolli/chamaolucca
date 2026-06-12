-- Chama O Lucca — v2 alignment (incremental, app-compatible)
-- Project: wjkytzvgbvkcaqjrqsbu

-- @chunk
-- profiles: allow driver role + prevent self-promotion to admin
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer', 'admin', 'driver'));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (
    public.is_admin()
    or (
      auth.uid() = id
      and role = (select p.role from public.profiles p where p.id = auth.uid())
    )
  );

-- delivery_slot_exceptions: optional admin note
alter table public.delivery_slot_exceptions
  add column if not exists reason text;

-- @chunk
-- Seed neighborhoods for Alagoinhas (express delivery uses Jardim Petrolar)
insert into public.neighborhoods (city, name, active) values
  ('Alagoinhas', 'Centro', true),
  ('Alagoinhas', 'Alagoinhas Velha', true),
  ('Alagoinhas', 'Barreiro', true),
  ('Alagoinhas', 'Santa Teresinha', true),
  ('Alagoinhas', 'Jardim Petrolar', true)
on conflict (city, name) do nothing;
