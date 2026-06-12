# ChamaoLucca — Contexto Completo do Projeto
> Gerado em: 11/06/2026 | Fonte: varredura completa do codebase por 4 agentes especializados

---

## 1. VISAO GERAL

| Campo | Valor |
|-------|-------|
| **Nome** | ChamaoLucca (Chamão do Lucca) |
| **Tipo** | E-commerce de frutas, verduras e hortifruti com entrega agendada |
| **Cidade** | Alagoinhas, Bahia |
| **Stack** | React 19 + Vite 8 + Supabase (BaaS) + Mercado Pago |
| **Linguagem** | JavaScript (sem TypeScript) |
| **CSS** | 100% hand-written (~166KB total, sem framework) |
| **Idioma UI** | pt-BR (Portugues Brasileiro) |
| **Hosting** | Netlify (SPA com `_redirects`) |
| **Supabase Project** | `wjkytzvgbvkcaqjrqsbu` |
| **Package name** | `temp-vite` (nao renomeado do scaffold) |

---

## 2. DEPENDENCIAS

### Producao
| Pacote | Versao |
|--------|--------|
| `react` | ^19.2.4 |
| `react-dom` | ^19.2.4 |
| `react-router-dom` | ^7.13.2 |
| `@supabase/supabase-js` | ^2.100.1 |

### Desenvolvimento
| Pacote | Versao |
|--------|--------|
| `vite` | ^8.0.1 |
| `@vitejs/plugin-react` | ^6.0.1 |
| `eslint` | ^9.39.4 |
| `eslint-plugin-react-hooks` | ^7.0.1 |
| `eslint-plugin-react-refresh` | ^0.5.2 |
| `globals` | ^17.4.0 |

> **Nota:** Nao ha framework CSS, testes, TypeScript ou PWA configurados.

---

## 3. VARIAVEIS DE AMBIENTE

| Variavel | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anonima (publica) |

**Arquivos que usam `import.meta.env`:**
- `src/lib/supabase.js` — inicializacao do cliente
- `src/admin/pages/AdminSettings.jsx` — URL para Edge Functions
- `src/admin/services/adminGeocoding.js` — URL + KEY para fetch
- `src/admin/services/adminRoutes.js` — URL + KEY para fetch
- `src/components/checkout/AddressStep.jsx` — URL para fetch

> ⚠️ Nao existe `.env.example`. Necessario criar.

---

## 4. ARQUITETURA DO FRONTEND

```
src/
├── main.jsx                          # Entry point (importa CSS global)
├── App.jsx                           # Router (react-router-dom v7)
├── lib/
│   ├── supabase.js                   # createClient(url, anonKey)
│   └── utils.js                      # formatCurrency, datas, slots
├── context/
│   ├── AuthContext.jsx               # Auth + profiles (signUp/signIn/signOut)
│   ├── CartContext.jsx               # Carrinho persistido (carts + cart_items)
│   ├── CheckoutContext.jsx           # Estado in-memory do checkout
│   └── StoreContext.jsx              # store_settings (horarios, frete)
├── pages/
│   ├── Home.jsx                      # Landing page
│   ├── Store.jsx                     # Catalogo + produtos
│   ├── ProductDetail.jsx             # Detalhe do produto
│   ├── Checkout.jsx                  # Checkout multi-step + placeOrder
│   ├── OrderConfirmation.jsx         # Confirmacao + retry pagamento
│   └── Profile.jsx                   # Perfil + historico + enderecos
├── components/
│   ├── auth/AuthModal.jsx            # Modal login/cadastro
│   ├── cart/CartPanel.jsx            # Painel carrinho (modal)
│   ├── cart/MobileCartBar.jsx        # Barra inferior mobile
│   ├── checkout/
│   │   ├── AddressStep.jsx           # Endereco + autocomplete + neighborhoods
│   │   ├── ScheduleStep.jsx          # Agenda (slots + RPC)
│   │   ├── PaymentStep.jsx           # Selecao de pagamento
│   │   └── ReviewStep.jsx            # Revisao + cupom
│   ├── landing/
│   │   ├── HeroSection.jsx           # Hero com mascote SVG
│   │   ├── BenefitsSection.jsx       # Beneficios
│   │   ├── CategoriesSection.jsx     # Categorias (hardcoded)
│   │   ├── DarkHighlightSection.jsx  # Secao escura + mockup celular
│   │   └── TestimonialsSection.jsx   # Depoimentos (hardcoded)
│   ├── layout/
│   │   ├── Header.jsx                # Cabecalho global
│   │   └── Footer.jsx                # Rodape
│   ├── store/
│   │   ├── ProductCard.jsx           # Card de produto
│   │   └── CartSidebar.jsx           # Sidebar carrinho desktop
│   └── ui/
│       ├── Icon.jsx                  # Wrapper Material Symbols
│       ├── HowToGetDialog.jsx        # Dialog "como chegar"
│       └── StoreDialogs.jsx          # ClosedStoreDialog + OutsideAreaDialog
└── admin/
    ├── AdminGuard.jsx                # Proteção de rota (isAdmin)
    ├── AdminLayout.jsx               # Layout sidebar + content
    ├── admin.css                     # Design system admin (29KB)
    ├── pages/
    │   ├── AdminDashboard.jsx
    │   ├── AdminOrders.jsx           # 68KB — maior arquivo do projeto
    │   ├── AdminProducts.jsx
    │   ├── AdminCategories.jsx
    │   ├── AdminDrivers.jsx
    │   ├── AdminRoutes.jsx
    │   ├── AdminRouteDetail.jsx
    │   ├── AdminGeocoding.jsx
    │   ├── AdminDeliveryExceptions.jsx
    │   ├── AdminCoupons.jsx
    │   └── AdminSettings.jsx
    └── services/
        ├── adminOrders.js
        ├── adminProducts.js
        ├── adminCategories.js
        ├── adminDrivers.js
        ├── adminRoutes.js
        ├── adminCoupons.js
        └── adminGeocoding.js
```

---

## 5. BANCO DE DADOS — MAPA COMPLETO DE TABELAS

### 5.1. Tabelas e Colunas

| # | Tabela | PK | Colunas | RLS |
|---|--------|-----|---------|-----|
| 1 | `profiles` | `id` (UUID → auth.users) | name, email, phone, whatsapp, cpf, role, avatar_url, promo_emails, created_at, updated_at | ✅ |
| 2 | `categories` | `id` (UUID) | name, slug, description, image_url, sort_order, active, created_at, updated_at | ✅ |
| 3 | `products` | `id` (UUID) | name, description, price, promotional_price, image_url, unit, active, featured, stock, slug, category_id (FK), created_at, updated_at | ✅ |
| 4 | `addresses` | `id` (UUID) | user_id (FK), label, street, number, complement, neighborhood, city, state, zip, is_default, created_at | ✅ |
| 5 | `carts` | `id` (UUID) | user_id (FK), status, created_at, updated_at | ✅ |
| 6 | `cart_items` | `id` (UUID) | cart_id (FK), product_id (FK), quantity, unit_price, created_at | ✅ |
| 7 | `coupons` | `id` (UUID) | code, description, discount_type, discount_value, min_order, max_uses, uses_count, active, expires_at, created_at, updated_at | ✅ |
| 8 | `orders` | `id` (UUID) | order_number, user_id (FK), status, subtotal, shipping, discount, total, coupon_code, payment_method, payment_status, payment_provider, payment_id, paid_at, pix_qr_code, pix_expires_at, delivery_address, delivery_complement, neighborhood, zip_code, phone, delivery_reference, delivery_date, delivery_time, delivery_mode, lat, lng, geocoded_at, observations, notes, created_at, updated_at | ✅ |
| 9 | `order_items` | `id` (UUID) | order_id (FK), product_id (FK), product_name, quantity, unit_price, total_price (GENERATED), image_url, created_at | ✅ |
| 10 | `drivers` | `id` (UUID) | name, phone, notes, active, created_at, updated_at | ✅ |
| 11 | `routes` | `id` (UUID) | name, delivery_date, status, maps_url, is_optimized, route_metadata (JSONB), batch_id, batch_index, driver_id (FK), driver_name, driver_phone, created_by (FK), created_at, updated_at | ✅ |
| 12 | `route_stops` | `id` (UUID) | route_id (FK), order_id (FK), stop_order, stop_status, notes, estimated_arrival, distance_from_prev, duration_from_prev, created_at | ✅ |
| 13 | `store_settings` | `key` (TEXT) | value, label, updated_at | ✅ |
| 14 | `delivery_slots` | `id` (UUID) | label, value, sort_order, active, max_orders, created_at | ✅ |
| 15 | `delivery_slot_exceptions` | `id` (UUID) | date/slot_id/active_override/max_orders_override OU date/slot/reason/is_available, created_at | ✅ |
| 16 | `neighborhoods` | `id` (UUID) | city, name, active | ✅ |

### 5.2. Tabelas NAO no schema original (April/database-schema.sql)

| Tabela | Status | Usada por |
|--------|--------|-----------|
| `neighborhoods` | ❌ AUSENTE | AdminSettings.jsx, AddressStep.jsx |
| `delivery_slots.max_orders` | ❌ COLUNA AUSENTE | AdminSettings.jsx |
| `delivery_slot_exceptions` | ⚠️ SCHEMA DIVERGENTE | AdminDeliveryExceptions.jsx usa slot_id/active_override/max_orders_override |

---

## 6. FUNCOES SQL (Functions & Triggers)

| Tipo | Nome | Descricao |
|------|------|-----------|
| **Trigger Function** | `handle_new_user()` | Cria profile com role='customer' apos signup em auth.users |
| **Trigger** | `on_auth_user_created` | AFTER INSERT em auth.users → handle_new_user() |
| **Trigger Function** | `set_order_number()` | Gera order_number sequencial via sequence |
| **Trigger** | `trg_set_order_number` | BEFORE INSERT em orders → set_order_number() |
| **RPC** | `increment_coupon_use(coupon_id)` | Incrementa uses_count atomicamente |
| **RPC** | `get_slot_availability(p_date)` | Retorna slots disponiveis para uma data |
| **RPC** | `get_slot_exceptions_for_date(p_date)` | Retorna excecoes de slot para uma data |
| **Sequence** | `order_number_seq` | Inicia em 1000, usado por set_order_number() |

---

## 7. EDGE FUNCTIONS

| # | Endpoint | Chamado por | Metodo | Payload |
|---|----------|-------------|--------|---------|
| 1 | `create-mp-preference` | Checkout.jsx, OrderConfirmation.jsx, Profile.jsx | `supabase.functions.invoke()` | `{ order_id, order_number, items[], payer_email, payer_name, shipping, app_url, payment_method }` |
| 2 | `geocode-address` | adminGeocoding.js | `fetch POST` | Single: `{ order_id, force }` / Batch: `{ batch: true, limit }` |
| 3 | `optimize-route` | adminRoutes.js | `fetch POST` | `{ stops: [{order_id, lat, lng, address}], origin_lat?, origin_lng?, origin_address?, departure_time? }` |
| 4 | `places-autocomplete` | AddressStep.jsx | `fetch POST` | `{ input: string }` |
| 5 | `place-details` | AddressStep.jsx | `fetch POST` | `{ place_id: string }` |
| 6 | `fetch-neighborhoods` | AdminSettings.jsx | `fetch POST` | `{ city: string }` |
| 7 | `place-order` | **NAO EXISTE (TODO)** | — | Deveria receber cart_id + coupon_code + delivery_data |

---

## 8. STORAGE BUCKETS

| Bucket | Operacoes | Usado por |
|--------|-----------|-----------|
| `product-images` | upload, getPublicUrl, remove | AdminProducts.jsx (ProductForm) |

---

## 9. MAPA DE INTERACOES POR AREA

### 9.1. Frontend (Cliente)

```
StoreContext     ← store_settings (READ all keys)
AuthContext      ← profiles (READ/UPSERT), auth.users (signUp/signIn/signOut/reset)
CartContext      ← carts (CRUD), cart_items (CRUD + products JOIN)
Store.jsx        ← categories (READ active), products (READ active + categories JOIN)
ProductDetail    ← products (READ by id + categories JOIN)
AddressStep      ← addresses (CRUD), neighborhoods (READ active)
                 ← Edge: places-autocomplete, place-details
ScheduleStep     ← RPC: get_slot_availability
ReviewStep       ← coupons (READ via validateCoupon)
Checkout         ← orders (INSERT), order_items (INSERT)
                 ← RPC: increment_coupon_use
                 ← Edge: create-mp-preference
OrderConfirm     ← orders (READ by id + order_items)
                 ← Edge: create-mp-preference (retry)
Profile          ← profiles (UPDATE), addresses (CRUD), orders (READ + items)
                 ← Edge: create-mp-preference (retry)
                 ← auth.updateUser (change password)
```

### 9.2. Admin

```
AdminDashboard   ← adminOrders.fetchOrderSummary(), adminProducts, adminCategories
AdminOrders      ← adminOrders (CRUD orders), adminRoutes (batch create)
AdminProducts    ← adminProducts (CRUD), Storage: product-images
AdminCategories  ← adminCategories (CRUD)
AdminDrivers     ← adminDrivers (CRUD + routes JOIN)
AdminRoutes      ← adminRoutes (CRUD routes + route_stops + orders update)
AdminRouteDetail ← adminRoutes.fetchRouteById(), adminDrivers
AdminGeocoding   ← adminGeocoding (orders stats + Edge: geocode-address)
AdminExceptions  ← delivery_slot_exceptions (CRUD), RPC: get_slot_exceptions_for_date
AdminCoupons     ← adminCoupons (CRUD + validateCoupon + RPC: increment_coupon_use)
AdminSettings    ← store_settings (READ/UPSERT), delivery_slots (READ/UPDATE),
                   neighborhoods (CRUD), Edge: fetch-neighborhoods
```

---

## 10. RLS POLICIES (Row Level Security)

| Tabela | SELECT | INSERT | UPDATE | DELETE | Admin Override |
|--------|--------|--------|--------|--------|----------------|
| profiles | own (uid=id) | — | own (uid=id, role locked) | — | ALL |
| categories | active=true | — | — | — | ALL |
| products | active=true | — | — | — | ALL |
| addresses | own (uid=user_id) | own | own | own | — |
| carts | own (uid=user_id) | own | own | own | — |
| cart_items | via carts owner | via carts owner | via carts owner | via carts owner | — |
| coupons | authenticated | — | — | — | ALL |
| orders | own (uid=user_id) | own | — | — | ALL |
| order_items | via orders owner | via orders owner | — | — | ALL |
| drivers | — | — | — | — | ALL (admin only) |
| routes | — | — | — | — | ALL (admin only) |
| route_stops | — | — | — | — | ALL (admin only) |
| store_settings | public (true) | — | — | — | ALL (admin write) |
| delivery_slots | public (true) | — | — | — | ALL (admin write) |
| delivery_slot_exceptions | public (true) | — | — | — | ALL (admin write) |

---

## 11. ISSUES DE SEGURANCA CONHECIDOS

| # | Severidade | Descricao | Status |
|---|-----------|-----------|--------|
| 01 | CRITICO | Preco calculado no cliente (total manipulavel via DevTools) | Pendente |
| 02 | CRITICO | Cupom validado apenas client-side (race condition) | Pendente |
| 03 | CRITICO | Role enviado no signUp (potencial escalacao admin) | Pendente |
| 04 | ALTO | RLS policies precisam revisao | Parcial |
| 05 | ALTO | Sem Content Security Policy | Pendente |
| 06 | ALTO | Sem rate limit no login | Pendente |
| 07 | MEDIO | Reset senha sem redirectTo | Pendente |
| 08 | MEDIO | order_items.unit_price do cliente | Pendente (dep. 01) |
| 09 | MEDIO | Checkbox "lembrar" sem efeito | Pendente |
| 10 | MEDIO | Admin rotas sem 404 | Pendente |
| 11 | BAIXO | Falta .env.example | Pendente |
| 12 | BAIXO | Sanitizacao texto livre | Pendente |

> Referencia completa: `April/security-audit.md`

---

## 12. ASSETS E RECURSOS EXTERNOS

### Arquivos Estaticos
| Arquivo | Local | Tamanho |
|---------|-------|---------|
| `favicon.svg` | public/ | 9.5KB |
| `icons.svg` | public/ | 5KB |
| `_redirects` | public/ | 20B (Netlify SPA) |
| `hero.png` | src/assets/ | 45KB |
| `fotoLaranja.png` | src/assets/ | 120KB |
| `logobylucca.png` | src/assets/ | 2.2KB |
| `mercadopagologo.png` | src/assets/ | 8.2KB |

### CDN/APIs Externas
| Servico | URL | Uso |
|---------|-----|-----|
| Google Fonts | fonts.googleapis.com | Inter, Pacifico, Material Symbols Rounded |
| Google Maps | google.com/maps | Embed iframe + directions URL |
| Mercado Pago | Via Edge Function | Pagamento (redirect flow) |
| Supabase | wjkytzvgbvkcaqjrqsbu.supabase.co | BaaS completo |

---

## 13. SEEDS (Dados Iniciais)

### store_settings
| Key | Value | Label |
|-----|-------|-------|
| open_time | 07:00 | Horario de abertura |
| close_time | 23:00 | Horario de fechamento |
| coverage_cities | Alagoinhas | Cidades atendidas |
| shipping_fee | 4.00 | Valor fixo do frete (R$) |
| free_shipping_above | 0 | Frete gratis acima de (R$) |
| free_shipping_active | false | Frete gratis habilitado |
| store_city | Alagoinhas | Cidade da loja |
| store_address | (vazio) | Endereco da loja |
| store_lat | (vazio) | Latitude da loja |
| store_lng | (vazio) | Longitude da loja |

### delivery_slots
| Label | Value | Sort |
|-------|-------|------|
| 08:00 - 10:00 | 08:00-10:00 | 1 |
| 10:00 - 12:00 | 10:00-12:00 | 2 |
| 12:00 - 14:00 | 12:00-14:00 | 3 |
| 14:00 - 16:00 | 14:00-16:00 | 4 |
| 16:00 - 18:00 | 16:00-18:00 | 5 |
| 18:00 - 20:00 | 18:00-20:00 | 6 |

---

## 14. NOTAS IMPORTANTES

1. **Sem TypeScript** — projeto inteiro em JavaScript puro
2. **Sem testes** — nenhum runner, framework ou script de teste
3. **Sem PWA** — nenhum service worker ou manifest
4. **Sem supabase/ local** — Edge Functions e migrations gerenciados via Dashboard
5. **Package name** — ainda `temp-vite` do scaffold original
6. **Netlify** — deployment via `_redirects` mas sem `netlify.toml`
7. **Cor tema** — `#16A34A` (green-600) definido em meta tag
8. **Fontes** — Inter (corpo), Pacifico (marca "Lucca"), Material Symbols (icones)
