-- =====================================================================
-- ChamaoLucca — Schema Completo do Banco de Dados
-- Gerado em: 07/04/2026 por Antigravity AI (reconstruido a partir do codigo)
-- Supabase Project: cxhzclpsuxulzvroptyl
-- =====================================================================
-- Como usar:
--   1. Crie um novo projeto no Supabase
--   2. Va em SQL Editor e execute este script inteiro
--   3. Configure as variaveis de ambiente no front-end
--   4. Ative as Edge Functions necessarias
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

-- RLS: usuario le e edita apenas o proprio perfil; admin le todos
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
-- Categorias de produtos.
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

-- RLS: qualquer um pode ver categorias ativas; apenas admin gerencia
CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT USING (active = true);

CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: products
-- Produtos do catalogo.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  promotional_price NUMERIC(10,2) CHECK (promotional_price >= 0),
  image_url         TEXT,
  unit              TEXT NOT NULL DEFAULT 'un',  -- ex: un, kg, L, cx
  active            BOOLEAN NOT NULL DEFAULT true,
  featured          BOOLEAN NOT NULL DEFAULT false,
  stock             INTEGER,
  slug              TEXT UNIQUE,
  category_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS: qualquer um pode ver produtos ativos; admin gerencia todos
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING (active = true);

CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: addresses
-- Enderecos salvos pelo usuario no perfil.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT 'Casa',  -- Casa, Trabalho, etc.
  street       TEXT NOT NULL,
  number       TEXT,
  complement   TEXT,
  neighborhood TEXT,
  city         TEXT NOT NULL,
  state        CHAR(2) NOT NULL DEFAULT 'BA',
  zip          TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- RLS: usuario ve e gerencia apenas seus proprios enderecos
CREATE POLICY "addresses_own" ON public.addresses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- TABELA: carts
-- Um carrinho ativo por usuario autenticado.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.carts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, status)  -- apenas um carrinho ativo por usuario
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_own" ON public.carts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- TABELA: cart_items
-- Itens dentro de cada carrinho.
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

-- RLS via carts: usuario ve apenas itens do proprio carrinho
CREATE POLICY "cart_items_own" ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: coupons
-- Cupons de desconto.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.coupons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT UNIQUE NOT NULL,
  description    TEXT,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order      NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses       INTEGER,  -- NULL = ilimitado
  uses_count     INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- RLS: qualquer usuario autenticado pode consultar cupons (para validar); admin gerencia
CREATE POLICY "coupons_authenticated_select" ON public.coupons
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Funcao para incrementar uses_count com seguranca
CREATE OR REPLACE FUNCTION public.increment_coupon_use(coupon_id UUID)
RETURNS VOID AS $$
  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = coupon_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────
-- TABELA: orders
-- Pedidos realizados pelos clientes.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number         INTEGER,          -- numero amigavel gerado
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
  payment_method       TEXT,            -- pix, credit_card, debit_card, cash
  payment_status       TEXT NOT NULL DEFAULT 'pending'
                       CHECK (payment_status IN ('pending','approved','in_process','rejected','cancelled','refunded')),
  payment_provider     TEXT DEFAULT 'mercadopago',
  payment_id           TEXT,            -- ID externo do gateway (MP)
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
  delivery_time        TEXT,            -- ex: '08:00-10:00' ou 'express'
  delivery_mode        TEXT,            -- 'scheduled' | 'express'
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

-- RLS: usuario ve apenas seus pedidos; admin ve todos
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Funcao para gerar order_number sequencial automaticamente
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
-- Itens de cada pedido (snapshot dos produtos no momento da compra).
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

-- RLS via orders: usuario ve apenas itens dos seus pedidos; admin ve todos
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
-- Entregadores cadastrados pelo admin.
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

-- RLS: apenas admin
CREATE POLICY "drivers_admin_only" ON public.drivers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: routes
-- Rotas de entrega criadas pelo admin.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.routes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  delivery_date  DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  maps_url       TEXT,
  is_optimized   BOOLEAN NOT NULL DEFAULT false,
  route_metadata JSONB,         -- dados retornados pela API do Google Maps
  batch_id       UUID,          -- agrupa rotas criadas juntas (lote)
  batch_index    INTEGER,       -- posicao dentro do lote
  driver_id      UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_name    TEXT,          -- desnormalizado para exibicao rapida
  driver_phone   TEXT,          -- desnormalizado para exibicao rapida
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- RLS: apenas admin
CREATE POLICY "routes_admin_only" ON public.routes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: route_stops
-- Paradas de uma rota (cada parada = um pedido).
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.route_stops (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id           UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  order_id           UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  stop_order         INTEGER NOT NULL,
  stop_status        TEXT NOT NULL DEFAULT 'pending' CHECK (stop_status IN ('pending','delivered','failed')),
  notes              TEXT,
  estimated_arrival  TEXT,     -- ex: '09:30'
  distance_from_prev NUMERIC,  -- metros
  duration_from_prev NUMERIC,  -- segundos
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

-- RLS: apenas admin
CREATE POLICY "route_stops_admin_only" ON public.route_stops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: store_settings
-- Configuracoes globais da loja (chave-valor).
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  label      TEXT,   -- descricao legivel da chave (para exibicao no admin)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- RLS: qualquer usuario le; apenas admin escreve
CREATE POLICY "store_settings_public_read" ON public.store_settings
  FOR SELECT USING (true);

CREATE POLICY "store_settings_admin_write" ON public.store_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────────────
-- TABELA: delivery_slots
-- Horarios de entrega disponiveis (gerenciado pelo admin em Configuracoes).
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.delivery_slots (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL,     -- ex: '08:00 - 10:00'
  value      TEXT NOT NULL,     -- ex: '08:00-10:00'
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
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
-- TABELA: delivery_slot_exceptions
-- Dias bloqueados ou com configuracao especial de entrega (agenda).
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE public.delivery_slot_exceptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         DATE NOT NULL,
  slot         TEXT,            -- NULL = dia inteiro bloqueado
  reason       TEXT,
  is_available BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- Garante que role seja sempre 'customer' (valor seguro, nao definido pelo cliente)
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
-- SEED: store_settings (valores padrao)
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
-- SEED: delivery_slots (horarios padrao)
-- ────────────────────────────────────────────────────────────────────
INSERT INTO public.delivery_slots (label, value, sort_order) VALUES
  ('08:00 - 10:00', '08:00-10:00', 1),
  ('10:00 - 12:00', '10:00-12:00', 2),
  ('12:00 - 14:00', '12:00-14:00', 3),
  ('14:00 - 16:00', '14:00-16:00', 4),
  ('16:00 - 18:00', '16:00-18:00', 5),
  ('18:00 - 20:00', '18:00-20:00', 6)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- PRIMEIRO ADMIN (rodar manualmente apos criar o usuario no Supabase Auth)
-- Substitua 'SEU-USER-ID-AQUI' pelo UUID do usuario admin
-- ────────────────────────────────────────────────────────────────────
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'SEU-USER-ID-AQUI';

-- ────────────────────────────────────────────────────────────────────
-- EDGE FUNCTIONS necessarias (nao estao no SQL - sao deployadas separado)
-- ────────────────────────────────────────────────────────────────────
-- 1. create-mp-preference  → cria preferencia de pagamento no Mercado Pago
-- 2. optimize-route        → otimiza ordem das paradas via Google Maps API
-- 3. geocode-address       → geocodifica enderecos dos pedidos
-- 4. place-order (TODO)    → recalcula preco server-side (ainda nao existe)
