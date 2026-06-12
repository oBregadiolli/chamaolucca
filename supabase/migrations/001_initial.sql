-- Chama O Lucca — initial schema
-- Project: wjkytzvgbvkcaqjrqsbu

-- @chunk
create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(unaccent(coalesce(input, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- @chunk
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  avatar_url text,
  cpf text,
  whatsapp text,
  promo_emails boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10,2) not null default 0,
  promotional_price numeric(10,2),
  compare_price numeric(10,2),
  image_url text,
  unit text not null default 'un',
  active boolean not null default true,
  featured boolean not null default false,
  stock int,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null,
  min_order numeric(10,2) not null default 0,
  max_uses int,
  uses_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value text not null default '',
  label text
);

create table if not exists public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  slot_label text not null,
  slot_start text not null,
  slot_end text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  max_orders int not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_slot_exceptions (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.delivery_slots(id) on delete cascade,
  date date not null,
  active_override boolean,
  max_orders_override int,
  updated_at timestamptz not null default now(),
  unique (slot_id, date)
);

create table if not exists public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (city, name)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  street text not null,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  zip text,
  phone text,
  reference text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'converted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists carts_one_active_per_user
  on public.carts (user_id)
  where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create sequence if not exists public.order_number_seq start 10001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null default nextval('public.order_number_seq') unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  total numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  coupon_code text,
  delivery_address text not null,
  delivery_complement text,
  neighborhood text,
  zip_code text,
  phone text,
  delivery_reference text,
  delivery_date date,
  delivery_time text,
  delivery_mode text check (delivery_mode in ('express', 'scheduled')),
  payment_method text,
  payment_status text not null default 'pending',
  payment_provider text,
  payment_id text,
  paid_at timestamptz,
  status text not null default 'received',
  observations text,
  notes text,
  lat double precision,
  lng double precision,
  geocoded_at timestamptz,
  pix_qr_code text,
  pix_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) generated always as (quantity * unit_price) stored,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_date date not null,
  status text not null default 'active',
  maps_url text,
  is_optimized boolean not null default false,
  route_metadata jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  batch_id uuid,
  batch_index int,
  driver_id uuid references public.drivers(id) on delete set null,
  driver_name text,
  driver_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  stop_order int not null,
  stop_status text not null default 'pending',
  notes text,
  estimated_arrival timestamptz,
  distance_from_prev numeric(10,2),
  duration_from_prev int,
  created_at timestamptz not null default now(),
  unique (route_id, order_id),
  unique (route_id, stop_order)
);

-- @chunk
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    'customer'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_category_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug = public.slugify(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists categories_set_slug on public.categories;
create trigger categories_set_slug
  before insert or update on public.categories
  for each row execute function public.set_category_slug();

create or replace function public.set_product_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug = public.slugify(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists products_set_slug on public.products;
create trigger products_set_slug
  before insert or update on public.products
  for each row execute function public.set_product_slug();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists coupons_updated_at on public.coupons;
create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

drop trigger if exists delivery_slots_updated_at on public.delivery_slots;
create trigger delivery_slots_updated_at before update on public.delivery_slots
  for each row execute function public.set_updated_at();

drop trigger if exists addresses_updated_at on public.addresses;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

drop trigger if exists carts_updated_at on public.carts;
create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

drop trigger if exists cart_items_updated_at on public.cart_items;
create trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists drivers_updated_at on public.drivers;
create trigger drivers_updated_at before update on public.drivers
  for each row execute function public.set_updated_at();

drop trigger if exists routes_updated_at on public.routes;
create trigger routes_updated_at before update on public.routes
  for each row execute function public.set_updated_at();

-- @chunk
create or replace function public.increment_coupon_use(coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons
  set uses_count = uses_count + 1,
      updated_at = now()
  where id = coupon_id;
end;
$$;

create or replace function public.get_slot_availability(p_date date)
returns table (
  id uuid,
  slot_label text,
  slot_start text,
  slot_end text,
  max_orders int,
  orders_count bigint,
  is_full boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with slot_effective as (
    select
      ds.id,
      ds.slot_label,
      ds.slot_start,
      ds.slot_end,
      coalesce(dse.max_orders_override, ds.max_orders) as max_orders,
      coalesce(dse.active_override, ds.active) as is_active
    from public.delivery_slots ds
    left join public.delivery_slot_exceptions dse
      on dse.slot_id = ds.id and dse.date = p_date
  )
  select
    se.id,
    se.slot_label,
    se.slot_start,
    se.slot_end,
    se.max_orders,
    coalesce(oc.orders_count, 0) as orders_count,
    case
      when not se.is_active then true
      when se.max_orders is null then false
      else coalesce(oc.orders_count, 0) >= se.max_orders
    end as is_full
  from slot_effective se
  left join lateral (
    select count(*)::bigint as orders_count
    from public.orders o
    where o.status <> 'cancelled'
      and o.delivery_date = p_date
      and o.delivery_time = se.slot_start || '-' || se.slot_end
  ) oc on true
  where se.is_active = true
  order by se.slot_start;
$$;

create or replace function public.get_slot_exceptions_for_date(p_date date)
returns table (
  slot_id uuid,
  slot_label text,
  global_active boolean,
  global_max_orders int,
  active_override boolean,
  max_orders_override int,
  exception_id uuid,
  has_exception boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ds.id as slot_id,
    ds.slot_label,
    ds.active as global_active,
    ds.max_orders as global_max_orders,
    dse.active_override,
    dse.max_orders_override,
    dse.id as exception_id,
    (dse.id is not null) as has_exception
  from public.delivery_slots ds
  left join public.delivery_slot_exceptions dse
    on dse.slot_id = ds.id and dse.date = p_date
  order by ds.sort_order, ds.slot_start;
$$;

-- @chunk
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.store_settings enable row level security;
alter table public.delivery_slots enable row level security;
alter table public.delivery_slot_exceptions enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.drivers enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert
  with check (auth.uid() = id or public.is_admin());

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (true);

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (true);

drop policy if exists store_settings_public_read on public.store_settings;
create policy store_settings_public_read on public.store_settings for select using (true);

drop policy if exists delivery_slots_public_read on public.delivery_slots;
create policy delivery_slots_public_read on public.delivery_slots for select using (true);

drop policy if exists neighborhoods_public_read on public.neighborhoods;
create policy neighborhoods_public_read on public.neighborhoods for select
  using (active = true or public.is_admin());

drop policy if exists coupons_read_active on public.coupons;
create policy coupons_read_active on public.coupons for select
  using (active = true or public.is_admin());

drop policy if exists addresses_own on public.addresses;
create policy addresses_own on public.addresses for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists carts_own on public.carts;
create policy carts_own on public.carts for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists cart_items_own on public.cart_items;
create policy cart_items_own on public.cart_items for all
  using (
    public.is_admin() or exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id and c.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id and c.user_id = auth.uid()
    )
  );

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders for insert
  with check (auth.uid() = user_id);

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert
  with check (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists coupons_admin_write on public.coupons;
create policy coupons_admin_write on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists store_settings_admin_write on public.store_settings;
create policy store_settings_admin_write on public.store_settings for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists delivery_slots_admin_write on public.delivery_slots;
create policy delivery_slots_admin_write on public.delivery_slots for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists delivery_slot_exceptions_admin on public.delivery_slot_exceptions;
create policy delivery_slot_exceptions_admin on public.delivery_slot_exceptions for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists neighborhoods_admin on public.neighborhoods;
create policy neighborhoods_admin on public.neighborhoods for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists drivers_admin on public.drivers;
create policy drivers_admin on public.drivers for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists routes_admin on public.routes;
create policy routes_admin on public.routes for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists route_stops_admin on public.route_stops;
create policy route_stops_admin on public.route_stops for all
  using (public.is_admin()) with check (public.is_admin());

grant execute on function public.get_slot_availability(date) to anon, authenticated;
grant execute on function public.increment_coupon_use(uuid) to authenticated;
grant execute on function public.get_slot_exceptions_for_date(date) to authenticated;

-- @chunk
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_admin_write on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- @chunk
insert into public.store_settings (key, value, label) values
  ('open_time', '07:00', 'Horário de abertura'),
  ('close_time', '23:00', 'Horário de fechamento'),
  ('coverage_cities', 'Alagoinhas', 'Cidades atendidas'),
  ('shipping_fee', '4.00', 'Valor fixo do frete (R$)'),
  ('free_shipping_above', '0', 'Frete grátis acima de (R$)'),
  ('free_shipping_active', 'false', 'Frete grátis habilitado'),
  ('store_city', 'Alagoinhas', 'Cidade da loja'),
  ('store_address', '', 'Endereço da loja'),
  ('store_lat', '', 'Latitude da loja'),
  ('store_lng', '', 'Longitude da loja')
on conflict (key) do nothing;

insert into public.delivery_slots (slot_label, slot_start, slot_end, sort_order, max_orders)
select v.slot_label, v.slot_start, v.slot_end, v.sort_order, v.max_orders
from (values
  ('Manhã cedo', '07:00', '09:00', 1, 15),
  ('Manhã', '09:00', '11:00', 2, 20),
  ('Meio-dia', '11:00', '13:00', 3, 20),
  ('Tarde', '14:00', '16:00', 4, 20),
  ('Final da tarde', '16:00', '18:00', 5, 15),
  ('Noite', '18:00', '20:00', 6, 10)
) as v(slot_label, slot_start, slot_end, sort_order, max_orders)
where not exists (
  select 1 from public.delivery_slots ds
  where ds.slot_start = v.slot_start
    and ds.slot_end = v.slot_end
    and ds.sort_order = v.sort_order
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
