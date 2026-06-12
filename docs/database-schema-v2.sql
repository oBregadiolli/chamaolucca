-- =====================================================================
-- ChamaoLucca — Schema Completo do Banco de Dados V2 (CORRIGIDO)
-- Gerado em: 11/06/2026 por Antigravity AI
-- Fonte: varredura completa do codebase por 4 agentes especializados
-- =====================================================================
-- DIFERENCAS EM RELACAO AO V1 (April/database-schema.sql):
--   ✅ Tabela `neighborhoods` adicionada (ausente no V1)
--   ✅ Coluna `max_orders` adicionada em `delivery_slots`
--   ✅ Tabela `delivery_slot_exceptions` corrigida (schema real do app)
--   ✅ RPC `get_slot_availability` adicionada
--   ✅ RPC `get_slot_exceptions_for_date` adicionada
--   ✅ RLS policies para neighborhoods adicionadas
--   ✅ Seeds expandidos com novas chaves de store_settings
-- =====================================================================
-- Como usar:
--   1. Crie um novo projeto no Supabase
--   2. Va em SQL Editor e execute este script inteiro
--   3. Configure as variaveis de ambiente no front-end (.env)
--   4. Deploy as Edge Functions separadamente
--   5. Crie o primeiro admin manualmente (instrucoes no final)
-- =====================================================================

-- ────────────────────────────────────────────────────────────────────
-- EXTENSOES
-- ────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────
-- TABELA: profiles
-- Vinculada a auth.users (1:1). Criada via trigger apos signup.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  whatsapp      TEXT,
  cpf           TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'driver')),
  avatar_url    TEXT,
  promo_emails  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: categories
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT USING (active = true);

CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: products
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  promotional_price NUMERIC(10,2) CHECK (promotional_price >= 0),
  image_url         TEXT,
  unit              TEXT NOT NULL DEFAULT 'un',
  active            BOOLEAN NOT NULL DEFAULT true,
  featured          BOOLEAN NOT NULL DEFAULT false,
  stock             INTEGER,
  slug              TEXT UNIQUE,
  category_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING (active = true);

CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: addresses
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT 'Casa',
  street       TEXT NOT NULL,
  number       TEXT,
  complement   TEXT,
  neighborhood TEXT,
  city         TEXT NOT NULL,
  state        CHAR(2) NOT NULL DEFAULT 'BA',
  zip          TEXT,
  phone        TEXT,
  reference    TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_own" ON public.addresses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- TABELA: neighborhoods  ★ NOVA (ausente no V1)
-- Bairros atendidos por cidade (usado no checkout para validacao).
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.neighborhoods (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city       TEXT NOT NULL,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

-- Qualquer usuario pode ver bairros ativos (necessario no checkout)
CREATE POLICY "neighborhoods_public_read" ON public.neighborhoods
  FOR SELECT USING (active = true);

-- Apenas admin gerencia bairros
CREATE POLICY "neighborhoods_admin_write" ON public.neighborhoods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: carts
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.carts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, status)
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_own" ON public.carts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- TABELA: cart_items
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.cart_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id    UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_items_own" ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: coupons
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.coupons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT UNIQUE NOT NULL,
  description    TEXT,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order      NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses       INTEGER,
  uses_count     INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_authenticated_select" ON public.coupons
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RPC: incrementar uses_count atomicamente
CREATE OR REPLACE FUNCTION public.increment_coupon_use(coupon_id UUID)
RETURNS VOID AS $$
  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = coupon_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────
-- TABELA: orders
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number         INTEGER,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'received'
                       CHECK (status IN ('received','preparing','delivering','delivered','cancelled')),
  -- Financeiro
  subtotal             NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping             NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount             NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code          TEXT,
  -- Pagamento
  payment_method       TEXT,
  payment_status       TEXT NOT NULL DEFAULT 'pending'
                       CHECK (payment_status IN ('pending','approved','in_process','rejected','cancelled','refunded')),
  payment_provider     TEXT DEFAULT 'mercadopago',
  payment_id           TEXT,
  paid_at              TIMESTAMPTZ,
  pix_qr_code          TEXT,
  pix_expires_at       TIMESTAMPTZ,
  -- Entrega
  delivery_address     TEXT NOT NULL,
  delivery_complement  TEXT,
  neighborhood         TEXT,
  zip_code             TEXT,
  phone                TEXT,
  delivery_reference   TEXT,
  delivery_date        DATE,
  delivery_time        TEXT,
  delivery_mode        TEXT,
  -- Geocodificacao
  lat                  NUMERIC(10,7),
  lng                  NUMERIC(10,7),
  geocoded_at          TIMESTAMPTZ,
  -- Extra
  observations         TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sequence + trigger para order_number
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := nextval('public.order_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- ────────────────────────────────────────────────────────────────────
-- TABELA: order_items
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price  NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "order_items_insert_own" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: drivers
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.drivers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  phone      TEXT,
  notes      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_admin_only" ON public.drivers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: routes
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.routes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  delivery_date  DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  maps_url       TEXT,
  is_optimized   BOOLEAN NOT NULL DEFAULT false,
  route_metadata JSONB,
  batch_id       UUID,
  batch_index    INTEGER,
  driver_id      UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_name    TEXT,
  driver_phone   TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_admin_only" ON public.routes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: route_stops
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.route_stops (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id           UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  order_id           UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  stop_order         INTEGER NOT NULL,
  stop_status        TEXT NOT NULL DEFAULT 'pending' CHECK (stop_status IN ('pending','delivered','failed')),
  notes              TEXT,
  estimated_arrival  TEXT,
  distance_from_prev NUMERIC,
  duration_from_prev NUMERIC,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_stops_admin_only" ON public.route_stops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: store_settings
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  label      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_settings_public_read" ON public.store_settings
  FOR SELECT USING (true);

CREATE POLICY "store_settings_admin_write" ON public.store_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: delivery_slots  ★ CORRIGIDA (adicionada coluna max_orders)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.delivery_slots (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  max_orders INTEGER,            -- ★ NOVO: capacidade maxima por slot
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_slots_public_read" ON public.delivery_slots
  FOR SELECT USING (true);

CREATE POLICY "delivery_slots_admin_write" ON public.delivery_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: delivery_slot_exceptions  ★ CORRIGIDA (schema real do app)
-- AdminDeliveryExceptions.jsx usa slot_id, active_override, max_orders_override
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.delivery_slot_exceptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date                DATE NOT NULL,
  slot_id             UUID REFERENCES public.delivery_slots(id) ON DELETE CASCADE,
  reason              TEXT,
  active_override     BOOLEAN,          -- NULL = sem override; true/false = sobrescreve slot.active
  max_orders_override INTEGER,          -- NULL = sem override; valor = sobrescreve max_orders
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_slot_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_exceptions_public_read" ON public.delivery_slot_exceptions
  FOR SELECT USING (true);

CREATE POLICY "delivery_exceptions_admin_write" ON public.delivery_slot_exceptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-criar profile apos signup
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────
-- RPC: get_slot_availability  ★ NOVA
-- Retorna disponibilidade de slots para uma data especifica.
-- Considera: slots ativos, excecoes, e contagem de pedidos existentes.
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_slot_availability(p_date DATE)
RETURNS TABLE (
  slot_id           UUID,
  slot_label        TEXT,
  slot_value        TEXT,
  slot_sort_order   INTEGER,
  slot_active       BOOLEAN,
  max_capacity      INTEGER,
  current_orders    BIGINT,
  remaining_capacity INTEGER,
  has_exception     BOOLEAN,
  exception_reason  TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id                                           AS slot_id,
    ds.label                                        AS slot_label,
    ds.value                                        AS slot_value,
    ds.sort_order                                   AS slot_sort_order,
    COALESCE(dse.active_override, ds.active)        AS slot_active,
    COALESCE(dse.max_orders_override, ds.max_orders) AS max_capacity,
    COUNT(o.id)                                     AS current_orders,
    COALESCE(dse.max_orders_override, ds.max_orders) - COUNT(o.id)::INTEGER AS remaining_capacity,
    (dse.id IS NOT NULL)                            AS has_exception,
    dse.reason                                      AS exception_reason
  FROM public.delivery_slots ds
  LEFT JOIN public.delivery_slot_exceptions dse
    ON dse.slot_id = ds.id AND dse.date = p_date
  LEFT JOIN public.orders o
    ON o.delivery_time = ds.value
    AND o.delivery_date = p_date
    AND o.status NOT IN ('cancelled')
  GROUP BY ds.id, ds.label, ds.value, ds.sort_order, ds.active, ds.max_orders,
           dse.id, dse.active_override, dse.max_orders_override, dse.reason
  ORDER BY ds.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────
-- RPC: get_slot_exceptions_for_date  ★ NOVA
-- Retorna todas as excecoes configuradas para uma data especifica.
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_slot_exceptions_for_date(p_date DATE)
RETURNS TABLE (
  exception_id        UUID,
  slot_id             UUID,
  slot_label          TEXT,
  slot_value          TEXT,
  active_override     BOOLEAN,
  max_orders_override INTEGER,
  reason              TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dse.id              AS exception_id,
    dse.slot_id,
    ds.label            AS slot_label,
    ds.value            AS slot_value,
    dse.active_override,
    dse.max_orders_override,
    dse.reason
  FROM public.delivery_slot_exceptions dse
  JOIN public.delivery_slots ds ON ds.id = dse.slot_id
  WHERE dse.date = p_date
  ORDER BY ds.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────
-- STORAGE BUCKET: product-images
-- ────────────────────────────────────────────────────────────────────
-- Criar via Dashboard: Storage > New bucket > "product-images" > Public
-- Ou via SQL (requer extensao storage):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- ────────────────────────────────────────────────────────────────────
-- SEED: store_settings
-- ────────────────────────────────────────────────────────────────────
INSERT INTO public.store_settings (key, value, label) VALUES
  ('open_time',            '07:00',       'Horario de abertura'),
  ('close_time',           '23:00',       'Horario de fechamento'),
  ('coverage_cities',      'Alagoinhas',  'Cidades atendidas'),
  ('shipping_fee',         '4.00',        'Valor fixo do frete (R$)'),
  ('free_shipping_above',  '0',           'Frete gratis acima de (R$)'),
  ('free_shipping_active', 'false',       'Frete gratis habilitado'),
  ('store_city',           'Alagoinhas',  'Cidade da loja'),
  ('store_address',        '',            'Endereco da loja (origem das rotas)'),
  ('store_lat',            '',            'Latitude da loja'),
  ('store_lng',            '',            'Longitude da loja')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- SEED: delivery_slots
-- ────────────────────────────────────────────────────────────────────
INSERT INTO public.delivery_slots (label, value, sort_order, max_orders) VALUES
  ('08:00 - 10:00', '08:00-10:00', 1, NULL),
  ('10:00 - 12:00', '10:00-12:00', 2, NULL),
  ('12:00 - 14:00', '12:00-14:00', 3, NULL),
  ('14:00 - 16:00', '14:00-16:00', 4, NULL),
  ('16:00 - 18:00', '16:00-18:00', 5, NULL),
  ('18:00 - 20:00', '18:00-20:00', 6, NULL)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- SEED: neighborhoods (exemplos para Alagoinhas)
-- ────────────────────────────────────────────────────────────────────
INSERT INTO public.neighborhoods (city, name, active) VALUES
  ('Alagoinhas', 'Centro', true),
  ('Alagoinhas', 'Alagoinhas Velha', true),
  ('Alagoinhas', 'Barreiro', true),
  ('Alagoinhas', 'Santa Teresinha', true)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- PRIMEIRO ADMIN
-- Substitua 'SEU-USER-ID-AQUI' pelo UUID do usuario admin
-- ────────────────────────────────────────────────────────────────────
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'SEU-USER-ID-AQUI';

-- ────────────────────────────────────────────────────────────────────
-- EDGE FUNCTIONS (deploy separado — nao fazem parte do SQL)
-- ────────────────────────────────────────────────────────────────────
-- 1. create-mp-preference   → Cria preferencia Mercado Pago
-- 2. optimize-route         → Otimiza rotas via Google Maps API
-- 3. geocode-address        → Geocodifica enderecos (single/batch)
-- 4. places-autocomplete    → Autocomplete de enderecos Google Places
-- 5. place-details          → Detalhes de um place_id Google Places
-- 6. fetch-neighborhoods    → Busca bairros via IBGE
-- 7. place-order          → Recalcula preco server-side (implementada — supabase/functions/place-order/index.ts)
