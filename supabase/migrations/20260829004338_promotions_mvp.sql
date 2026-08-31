-- Chama O Lucca - MVP de promocoes configuraveis

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null check (type in ('product_price', 'free_product')),
  min_subtotal numeric(10,2) not null default 0 check (min_subtotal >= 0),
  trigger_product_id uuid references public.products(id) on delete set null,
  reward_product_id uuid not null references public.products(id) on delete cascade,
  reward_price numeric(10,2) check (reward_price is null or reward_price >= 0),
  max_quantity_per_order int not null default 1 check (max_quantity_per_order > 0),
  priority int not null default 100,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_product_price_requires_price check (
    type <> 'product_price' or reward_price is not null
  ),
  constraint promotions_free_product_requires_trigger check (
    type <> 'free_product' or trigger_product_id is not null
  ),
  constraint promotions_valid_period check (
    starts_at is null or ends_at is null or starts_at <= ends_at
  )
);

create index if not exists promotions_active_period_idx
  on public.promotions (active, starts_at, ends_at, priority);

create index if not exists promotions_trigger_product_id_idx
  on public.promotions (trigger_product_id);

create index if not exists promotions_reward_product_id_idx
  on public.promotions (reward_product_id);

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

alter table public.promotions enable row level security;

revoke all on table public.promotions from anon, authenticated;
grant select on table public.promotions to anon, authenticated;
grant insert, update, delete on table public.promotions to authenticated;

drop policy if exists promotions_public_read_active on public.promotions;
create policy promotions_public_read_active on public.promotions for select
  to anon, authenticated
  using (
    (
      active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
    or public.is_admin()
  );

drop policy if exists promotions_admin_write on public.promotions;
create policy promotions_admin_write on public.promotions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
