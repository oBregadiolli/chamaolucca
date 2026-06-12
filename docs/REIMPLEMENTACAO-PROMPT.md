# 🚀 PROMPT DE REIMPLEMENTAÇÃO COMPLETA — ChamaoLucca

> **INSTRUÇÃO:** Cole este prompt inteiro em uma nova sessão do Antigravity/Claude/Gemini.
> O agente que receber deve ter acesso ao **Supabase MCP Server** já configurado.
> Substitua os placeholders `{{...}}` pelos valores reais antes de colar.

---

## CONTEXTO

Você é um engenheiro backend especialista em Supabase. Estou recriando TODA a infraestrutura de banco de dados e Edge Functions do projeto **ChamaoLucca** — um e-commerce de frutas/hortifruti com delivery agendado em Alagoinhas-BA.

**SITUAÇÃO:** Perdi acesso ao projeto Supabase antigo (`cxhzclpsuxulzvroptyl`). Tenho um **projeto novo já criado** e preciso recriar:
1. ✅ Todas as 16 tabelas com RLS policies
2. ✅ 3 triggers + 1 sequence
3. ✅ 3 RPC functions
4. ✅ 7 Edge Functions (6 existentes + 1 nova de segurança)
5. ✅ 1 Storage bucket
6. ✅ Seeds de dados iniciais
7. ✅ Configurar secrets (Mercado Pago, Google Maps)

**O frontend React já existe** — só precisa trocar o `.env` com as novas credenciais.

---

## CREDENCIAIS DO NOVO PROJETO

```
NOVO SUPABASE PROJECT REF: {{NOVO_PROJECT_REF}}
NOVO SUPABASE URL: https://{{NOVO_PROJECT_REF}}.supabase.co
NOVO SUPABASE ANON KEY: {{NOVO_ANON_KEY}}
NOVO SUPABASE SERVICE ROLE KEY: {{NOVO_SERVICE_ROLE_KEY}}

MERCADO PAGO ACCESS TOKEN: {{MP_ACCESS_TOKEN}}
GOOGLE MAPS API KEY: {{GOOGLE_MAPS_API_KEY}}
```

---

## FASE 1: SCHEMA DO BANCO DE DADOS

Execute o SQL abaixo via `execute_sql` do Supabase MCP. **Execute em blocos** (não tudo de uma vez para evitar timeout).

### Bloco 1.1 — Extensões + Tabela `profiles`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
```

### Bloco 1.2 — Tabelas `categories` + `products`

```sql
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
```

### Bloco 1.3 — Tabelas `addresses` + `neighborhoods`

```sql
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

CREATE TABLE public.neighborhoods (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city       TEXT NOT NULL,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neighborhoods_public_read" ON public.neighborhoods
  FOR SELECT USING (active = true);

CREATE POLICY "neighborhoods_admin_write" ON public.neighborhoods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Bloco 1.4 — Tabelas `carts` + `cart_items`

```sql
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
```

### Bloco 1.5 — Tabela `coupons` + RPC

```sql
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

CREATE OR REPLACE FUNCTION public.increment_coupon_use(coupon_id UUID)
RETURNS VOID AS $$
  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = coupon_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

### Bloco 1.6 — Tabelas `orders` + `order_items` + Sequence/Trigger

```sql
CREATE TABLE public.orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number         INTEGER,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'received'
                       CHECK (status IN ('received','preparing','delivering','delivered','cancelled')),
  subtotal             NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping             NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount             NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code          TEXT,
  payment_method       TEXT,
  payment_status       TEXT NOT NULL DEFAULT 'pending'
                       CHECK (payment_status IN ('pending','approved','in_process','rejected','cancelled','refunded')),
  payment_provider     TEXT DEFAULT 'mercadopago',
  payment_id           TEXT,
  paid_at              TIMESTAMPTZ,
  pix_qr_code          TEXT,
  pix_expires_at       TIMESTAMPTZ,
  delivery_address     TEXT NOT NULL,
  delivery_complement  TEXT,
  neighborhood         TEXT,
  zip_code             TEXT,
  phone                TEXT,
  delivery_reference   TEXT,
  delivery_date        DATE,
  delivery_time        TEXT,
  delivery_mode        TEXT,
  lat                  NUMERIC(10,7),
  lng                  NUMERIC(10,7),
  geocoded_at          TIMESTAMPTZ,
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
```

### Bloco 1.7 — Tabelas `drivers` + `routes` + `route_stops`

```sql
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
```

### Bloco 1.8 — Tabelas `store_settings` + `delivery_slots` + `delivery_slot_exceptions`

```sql
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

CREATE TABLE public.delivery_slots (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  max_orders INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_slots_public_read" ON public.delivery_slots
  FOR SELECT USING (true);

CREATE POLICY "delivery_slots_admin_write" ON public.delivery_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE public.delivery_slot_exceptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date                DATE NOT NULL,
  slot_id             UUID REFERENCES public.delivery_slots(id) ON DELETE CASCADE,
  reason              TEXT,
  active_override     BOOLEAN,
  max_orders_override INTEGER,
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
```

### Bloco 1.9 — Triggers + RPCs

```sql
-- Trigger: auto-criar profile após signup
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

-- RPC: disponibilidade de slots para uma data
CREATE OR REPLACE FUNCTION public.get_slot_availability(p_date DATE)
RETURNS TABLE (
  slot_id UUID, slot_label TEXT, slot_value TEXT, slot_sort_order INTEGER,
  slot_active BOOLEAN, max_capacity INTEGER, current_orders BIGINT,
  remaining_capacity INTEGER, has_exception BOOLEAN, exception_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id, ds.label, ds.value, ds.sort_order,
    COALESCE(dse.active_override, ds.active),
    COALESCE(dse.max_orders_override, ds.max_orders),
    COUNT(o.id),
    COALESCE(dse.max_orders_override, ds.max_orders) - COUNT(o.id)::INTEGER,
    (dse.id IS NOT NULL),
    dse.reason
  FROM public.delivery_slots ds
  LEFT JOIN public.delivery_slot_exceptions dse ON dse.slot_id = ds.id AND dse.date = p_date
  LEFT JOIN public.orders o ON o.delivery_time = ds.value AND o.delivery_date = p_date AND o.status NOT IN ('cancelled')
  GROUP BY ds.id, ds.label, ds.value, ds.sort_order, ds.active, ds.max_orders, dse.id, dse.active_override, dse.max_orders_override, dse.reason
  ORDER BY ds.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: exceções de slot para uma data
CREATE OR REPLACE FUNCTION public.get_slot_exceptions_for_date(p_date DATE)
RETURNS TABLE (
  exception_id UUID, slot_id UUID, slot_label TEXT, slot_value TEXT,
  active_override BOOLEAN, max_orders_override INTEGER, reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT dse.id, dse.slot_id, ds.label, ds.value, dse.active_override, dse.max_orders_override, dse.reason
  FROM public.delivery_slot_exceptions dse
  JOIN public.delivery_slots ds ON ds.id = dse.slot_id
  WHERE dse.date = p_date
  ORDER BY ds.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Bloco 1.10 — Seeds

```sql
INSERT INTO public.store_settings (key, value, label) VALUES
  ('open_time',            '07:00',       'Horário de abertura'),
  ('close_time',           '23:00',       'Horário de fechamento'),
  ('coverage_cities',      'Alagoinhas',  'Cidades atendidas'),
  ('shipping_fee',         '4.00',        'Valor fixo do frete (R$)'),
  ('free_shipping_above',  '0',           'Frete grátis acima de (R$)'),
  ('free_shipping_active', 'false',       'Frete grátis habilitado'),
  ('store_city',           'Alagoinhas',  'Cidade da loja'),
  ('store_address',        '',            'Endereço da loja (origem das rotas)'),
  ('store_lat',            '',            'Latitude da loja'),
  ('store_lng',            '',            'Longitude da loja')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.delivery_slots (label, value, sort_order, max_orders) VALUES
  ('08:00 - 10:00', '08:00-10:00', 1, NULL),
  ('10:00 - 12:00', '10:00-12:00', 2, NULL),
  ('12:00 - 14:00', '12:00-14:00', 3, NULL),
  ('14:00 - 16:00', '14:00-16:00', 4, NULL),
  ('16:00 - 18:00', '16:00-18:00', 5, NULL),
  ('18:00 - 20:00', '18:00-20:00', 6, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.neighborhoods (city, name, active) VALUES
  ('Alagoinhas', 'Centro', true),
  ('Alagoinhas', 'Alagoinhas Velha', true),
  ('Alagoinhas', 'Barreiro', true),
  ('Alagoinhas', 'Santa Teresinha', true)
ON CONFLICT DO NOTHING;
```

---

## FASE 2: STORAGE BUCKET

Criar o bucket `product-images` como **público** via Dashboard:
- Storage → New Bucket → Name: `product-images` → Public: ✅

Ou via SQL:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
```

---

## FASE 3: EDGE FUNCTIONS

### 3.1. `create-mp-preference`

Cria preferência de pagamento no Mercado Pago e retorna URL de checkout.

**Secret necessário:** `MP_ACCESS_TOKEN`

```typescript
// supabase/functions/create-mp-preference/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id, order_number, items, payer_email, payer_name, shipping, app_url, payment_method } = await req.json();

    const mpItems = items.map((i: any) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      currency_id: "BRL",
    }));

    if (shipping > 0) {
      mpItems.push({ title: "Frete", quantity: 1, unit_price: Number(shipping), currency_id: "BRL" });
    }

    const body = {
      items: mpItems,
      payer: { email: payer_email, name: payer_name },
      external_reference: order_id,
      back_urls: {
        success: `${app_url}/pedido/${order_id}?status=approved`,
        failure: `${app_url}/pedido/${order_id}?status=rejected`,
        pending: `${app_url}/pedido/${order_id}?status=pending`,
      },
      auto_return: "approved",
      statement_descriptor: "CHAMAOLUCCA",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
    };

    // Pre-select payment method tab
    if (payment_method === "pix") {
      (body as any).payment_methods = { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }] };
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: data.message || "Erro MP" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ ok: true, checkout_url: data.init_point, preference_id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

### 3.2. `geocode-address`

Geocodifica endereços de pedidos via Google Geocoding API.

**Secret:** `GOOGLE_MAPS_API_KEY`

```typescript
// supabase/functions/geocode-address/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { order_id, batch, limit = 50, force } = await req.json();

  async function geocodeOne(orderId: string, forceGeocode = false) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, delivery_address, neighborhood, lat, lng")
      .eq("id", orderId)
      .single();

    if (!order) return { error: "Order not found" };
    if (order.lat && !forceGeocode) return { skipped: true, lat: order.lat, lng: order.lng };

    const address = `${order.delivery_address}, ${order.neighborhood || ""}, Alagoinhas, BA, Brasil`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results[0]) return { error: `Geocoding failed: ${data.status}` };

    const { lat, lng } = data.results[0].geometry.location;
    await supabase.from("orders").update({ lat, lng, geocoded_at: new Date().toISOString() }).eq("id", orderId);

    return { lat, lng, formatted: data.results[0].formatted_address };
  }

  try {
    if (batch) {
      const { data: orders } = await supabase
        .from("orders").select("id")
        .is("lat", null).not("status", "eq", "cancelled")
        .limit(limit);

      const results = [];
      for (const o of orders || []) {
        results.push({ order_id: o.id, ...(await geocodeOne(o.id, false)) });
      }
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await geocodeOne(order_id, force);
    return new Response(JSON.stringify({ ok: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
```

### 3.3. `optimize-route`

Otimiza ordem das paradas via Google Directions API.

**Secret:** `GOOGLE_MAPS_API_KEY`

```typescript
// supabase/functions/optimize-route/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { stops, origin_lat, origin_lng, origin_address, departure_time } = await req.json();

  const origin = origin_lat && origin_lng ? `${origin_lat},${origin_lng}` : encodeURIComponent(origin_address || "Alagoinhas, BA");
  const waypoints = stops.map((s: any) => s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(s.address)).join("|");

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=optimize:true|${waypoints}&key=${GOOGLE_KEY}&language=pt-BR`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    return new Response(JSON.stringify({ ok: false, error: data.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }

  const route = data.routes[0];
  const optimizedOrder = route.waypoint_order;
  const legs = route.legs;

  const optimizedStops = optimizedOrder.map((idx: number, i: number) => ({
    ...stops[idx],
    stop_order: i + 1,
    distance_from_prev: legs[i]?.distance?.value || 0,
    duration_from_prev: legs[i]?.duration?.value || 0,
    estimated_arrival: legs[i]?.duration?.text || "",
  }));

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&waypoints=${optimizedStops.map((s: any) => s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(s.address)).join("|")}`;

  return new Response(JSON.stringify({
    ok: true,
    stops: optimizedStops,
    maps_url: mapsUrl,
    total_distance: route.legs.reduce((s: number, l: any) => s + (l.distance?.value || 0), 0),
    total_duration: route.legs.reduce((s: number, l: any) => s + (l.duration?.value || 0), 0),
    route_metadata: { bounds: route.bounds, overview_polyline: route.overview_polyline },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

### 3.4. `places-autocomplete`

```typescript
// supabase/functions/places-autocomplete/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { input } = await req.json();
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:br&language=pt-BR&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  return new Response(JSON.stringify({ predictions: data.predictions || [] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 3.5. `place-details`

```typescript
// supabase/functions/place-details/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { place_id } = await req.json();
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=formatted_address,address_components,geometry&language=pt-BR&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  return new Response(JSON.stringify({ result: data.result || null }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 3.6. `fetch-neighborhoods`

```typescript
// supabase/functions/fetch-neighborhoods/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { city } = await req.json();

  // Busca município no IBGE
  const searchUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`;
  const munRes = await fetch(searchUrl);
  const municipios = await munRes.json();
  const match = municipios.find((m: any) => m.nome.toLowerCase() === city.toLowerCase());

  if (!match) {
    return new Response(JSON.stringify({ ok: false, error: "Município não encontrado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
    });
  }

  // Busca distritos/subdistritos como proxy de bairros
  const distUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${match.id}/distritos`;
  const distRes = await fetch(distUrl);
  const distritos = await distRes.json();

  return new Response(JSON.stringify({
    ok: true,
    city: match.nome,
    neighborhoods: distritos.map((d: any) => d.nome),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

### 3.7. `place-order` ★ NOVA (Segurança — ITEM 01)

Edge Function que recalcula preços server-side para impedir manipulação.

**Secret:** `SUPABASE_SERVICE_ROLE_KEY` (já disponível automaticamente)

```typescript
// supabase/functions/place-order/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Autenticar o usuário via JWT
  const authHeader = req.headers.get("Authorization");
  const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader! } },
  });
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
  }

  // Service role para operações privilegiadas
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { cart_id, coupon_code, delivery_data, payment_method } = await req.json();

    // 1. Buscar itens do carrinho com preços REAIS do banco
    const { data: cartItems, error: cartError } = await supabase
      .from("cart_items")
      .select("product_id, quantity, products(id, name, price, image_url, active)")
      .eq("cart_id", cart_id);

    if (cartError || !cartItems?.length) {
      return new Response(JSON.stringify({ ok: false, error: "Carrinho vazio ou inválido" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // Verificar se todos os produtos estão ativos
    for (const item of cartItems) {
      if (!item.products?.active) {
        return new Response(JSON.stringify({ ok: false, error: `Produto "${item.products?.name}" não está mais disponível` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }
    }

    // 2. Calcular subtotal com preços do BANCO
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.products!.price) * item.quantity), 0);

    // 3. Validar cupom server-side
    let discount = 0;
    let couponId = null;
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase().trim())
        .eq("active", true)
        .maybeSingle();

      if (coupon) {
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          return new Response(JSON.stringify({ ok: false, error: "Cupom expirado" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }
        if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) {
          return new Response(JSON.stringify({ ok: false, error: "Cupom esgotado" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }
        if (coupon.min_order > 0 && subtotal < Number(coupon.min_order)) {
          return new Response(JSON.stringify({ ok: false, error: `Pedido mínimo R$ ${Number(coupon.min_order).toFixed(2)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }
        discount = coupon.discount_type === "percentage"
          ? parseFloat((subtotal * (Number(coupon.discount_value) / 100)).toFixed(2))
          : Math.min(Number(coupon.discount_value), subtotal);
        couponId = coupon.id;
      }
    }

    // 4. Calcular frete server-side
    const { data: settings } = await supabase.from("store_settings").select("key, value");
    const cfg = Object.fromEntries((settings || []).map((s: any) => [s.key, s.value]));
    let shipping = parseFloat(cfg.shipping_fee || "4");
    if (cfg.free_shipping_active === "true" && parseFloat(cfg.free_shipping_above || "0") > 0 && subtotal >= parseFloat(cfg.free_shipping_above)) {
      shipping = 0;
    }

    const total = parseFloat((subtotal - discount + shipping).toFixed(2));

    // 5. Inserir pedido
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: user.id,
      subtotal, shipping, discount, total,
      coupon_code: coupon_code || null,
      delivery_address: delivery_data.address,
      neighborhood: delivery_data.neighborhood || "",
      phone: delivery_data.phone || "",
      zip_code: delivery_data.zip_code || "",
      delivery_reference: delivery_data.reference || "",
      delivery_date: delivery_data.delivery_date,
      delivery_time: delivery_data.delivery_time,
      delivery_mode: delivery_data.delivery_mode,
      payment_method,
      payment_status: "pending",
      payment_provider: "mercadopago",
      status: "received",
    }).select().single();

    if (orderError) throw orderError;

    // 6. Inserir itens com preços REAIS
    await supabase.from("order_items").insert(
      cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.products!.name,
        quantity: item.quantity,
        unit_price: Number(item.products!.price),
        image_url: item.products!.image_url || null,
      }))
    );

    // 7. Incrementar uso do cupom
    if (couponId) {
      await supabase.rpc("increment_coupon_use", { coupon_id: couponId });
    }

    // 8. Limpar carrinho
    await supabase.from("cart_items").delete().eq("cart_id", cart_id);
    await supabase.from("carts").delete().eq("id", cart_id);

    return new Response(JSON.stringify({ ok: true, order }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
```

---

## FASE 4: CONFIGURAR SECRETS

No Supabase Dashboard → Edge Functions → Manage Secrets:

```
MP_ACCESS_TOKEN = {{MP_ACCESS_TOKEN}}
GOOGLE_MAPS_API_KEY = {{GOOGLE_MAPS_API_KEY}}
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente.

---

## FASE 5: ATUALIZAR .env DO FRONTEND

```bash
VITE_SUPABASE_URL=https://{{NOVO_PROJECT_REF}}.supabase.co
VITE_SUPABASE_ANON_KEY={{NOVO_ANON_KEY}}
```

---

## FASE 6: CRIAR PRIMEIRO ADMIN

1. Acesse o app e crie uma conta normalmente (signup)
2. No Supabase Dashboard → Authentication → Users → copie o UUID do usuário
3. Execute no SQL Editor:
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'SEU-UUID-AQUI';
```

---

## FASE 7: CHECKLIST DE VERIFICAÇÃO

Após tudo configurado, verifique:

- [ ] Signup cria profile automaticamente (trigger `handle_new_user`)
- [ ] Login funciona e busca profile
- [ ] Loja carrega produtos e categorias
- [ ] Carrinho persiste no banco (carts + cart_items)
- [ ] Checkout: endereço com autocomplete funciona
- [ ] Checkout: agendamento mostra slots disponíveis
- [ ] Checkout: cupom valida corretamente
- [ ] Checkout: pagamento redireciona para Mercado Pago
- [ ] Admin: pedidos aparecem com detalhes
- [ ] Admin: produtos CRUD funciona
- [ ] Admin: upload de imagem funciona (Storage)
- [ ] Admin: categorias CRUD funciona
- [ ] Admin: motoristas CRUD funciona
- [ ] Admin: rotas criam e otimizam
- [ ] Admin: geocodificação funciona
- [ ] Admin: exceções de entrega funcionam
- [ ] Admin: cupons CRUD funciona
- [ ] Admin: configurações salvam e carregam
