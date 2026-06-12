-- Chama O Lucca — MVP: harden orders RLS (block client payment tampering)
-- Project: wjkytzvgbvkcaqjrqsbu

-- @chunk
-- Orders are created only via place-order (service_role). Clients read own orders; only admin updates.
drop policy if exists orders_insert_own on public.orders;
drop policy if exists orders_update on public.orders;

create policy orders_update_admin on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());
